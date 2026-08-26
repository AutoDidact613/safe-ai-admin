import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Tag from '../models/tag'; 
import ModerationLog from '../models/ModerationLog';
import { User } from '../models/user';
import NodeCache from 'node-cache'; // ייבוא תקין של ה-Cache בשרת
import { getEmbedding, refineContent, suggestTitles, suggestTags } from '../services/aiService';
import { signAttachments } from '../services/s3Service';
import { buildPostListPipeline, buildPostListWithCountPipeline } from '../services/postAggregationService';
import { resolveOrCreateTagByName } from '../services/tagService';
import logger from '../logger';
import { getOrganizationIdForLog } from '../utils/forumLogContext';

// אתחול זיכרון המטמון הגלובלי בשרת
const recommendationCache = new NodeCache({ stdTTL: 1800, checkperiod: 60 });

/**
 * מנקה את כל ה-Cache של רשימות הפוסטים (כל העמודים, כל התפקידים).
 * נקרא בכל פעולה שיכולה לשנות את מה שמוצג ברשימה - פוסט חדש, תגובה חדשה
 * (משנה lastActivity ואת המיון), או שינוי סטטוס חסימה - כדי שהמשתמשת לא
 * תצטרך לחכות ל-TTL של 10 שניות כדי לראות את השינוי שלה עצמה.
 */
function invalidatePostsListCache() {
  const staleKeys = recommendationCache.keys().filter((key) => key.startsWith('posts-list:'));
  if (staleKeys.length > 0) {
    recommendationCache.del(staleKeys);
  }
}

/**
 * skip/limit הם אופציונליים: אם לא מועברים, לא מתבצע דילוג/הגבלה (למסך חיפוש למשל).
 * (בניית ה-pipeline עצמה הועברה לשירות services/postAggregationService.ts)
 */

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { userRole } = req.query;

    // 1. קריאת העמוד הנוכחי מה-Query Parameters (ברירת מחדל: עמוד 1)
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; // הגדרה קבועה של 10 פוסטים לעמוד
    const skip = (page - 1) * limit; // חישוב כמה פוסטים לדלג עליהם

    const filterQuery: any = {};
    if (userRole !== 'admin') {
      filterQuery.isBlocked = { $ne: true };
    }

    // Cache קצר-טווח (10 שניות) לרשימת הפוסטים - זה הנתיב הכי נטען באתר,
    // וכל המשתמשות עם אותו userRole מקבלות תוצאה זהה לאותו עמוד. חלון
    // זמן קצר כזה משמעו שפוסט חדש יופיע כמעט מיידית, אבל בעומס גבוה
    // (הרבה כניסות בבת אחת) רוב הבקשות נענות מהזיכרון ולא ממסד הנתונים.
    const listCacheKey = `posts-list:${page}:${userRole || 'user'}`;
    const cachedList = recommendationCache.get(listCacheKey);
    if (cachedList) {
      return res.status(200).json(cachedList);
    }

    // 2+3. שליפת הפוסטים לעמוד הנוכחי (עם author/tags/commentCount/lastComment)
    // וגם הספירה הכוללת - בקריאה אחת בלבד למסד הנתונים (לפני כן: שתי קריאות נפרדות)
    const [result] = await Post.aggregate(
      buildPostListWithCountPipeline(filterQuery, skip, limit)
    );

    const postsWithDetails = result?.data || [];
    const totalPosts = result?.totalCount || 0;
    const totalPages = Math.ceil(totalPosts / limit);

    const responseBody = {
      posts: postsWithDetails,
      currentPage: page,
      totalPages: totalPages,
      totalPosts: totalPosts
    };

    // TTL קצר בכוונה (10 שניות) - שונה מה-TTL הכללי (30 דקות) של שאר ה-Cache
    recommendationCache.set(listCacheKey, responseBody, 10);

    // 4. החזרת הפוסטים יחד עם נתוני העמודים ל-Frontend
    res.status(200).json(responseBody);

  } catch (error: any) {
    logger.error('Failed to fetch posts list', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      page: req.query.page,
      userRole: req.query.userRole,
    });
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    // 1. הגנה: מניעת HTTP Cache כדי להכריח את הדפדפן לקבל מפתחות חתימה טריים בכל פעם
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const post = await Post.findById(req.params.id)
      .populate('author', 'name')
      .populate('tags', 'name')
      .lean(); // מאפשר שינוי ישיר של המערכים בזיכרון
      
    if (!post) {
      return res.status(404).json({ message: 'הפוסט לא נמצא' });
    }

    // 2. חתימה דינמית על קבצי הפוסט הראשי מול S3 (בתוקף ל-15 דקות)
    if (post.attachments && post.attachments.length > 0) {
      post.attachments = await signAttachments(post.attachments);
    }

    // שליפת התגובות לפוסט
    const comments = await Comment.find({ postId: String(req.params.id) }).populate('author', 'name').lean();

    // 3. חתימה דינמית על קבצי התגובות מול S3 (במידה וקיימים)
    // מקביל על כל התגובות בבת אחת, במקום תגובה-אחר-תגובה ברצף (שהיה מאט
    // ליניארית ככל שיש יותר תגובות עם קבצים מצורפים לפוסט)
    await Promise.all(
      comments.map(async (comment) => {
        if (comment.attachments && comment.attachments.length > 0) {
          comment.attachments = await signAttachments(comment.attachments);
        }
      })
    );

    // 4. החזרת המידע החתום והטרי ל-React
    return res.status(200).json({ post, comments });

  } catch (error: any) {
    logger.error('Failed to fetch post thread with signed attachments', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      postId: req.params.id,
    });
    return res.status(500).json({
      message: 'שגיאה בהבאת השרשור והקבצים המאובטחים',
      error: error.message,
    });
  }
};

export const incrementView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; 

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'הפוסט לא נמצא' });
    }

    if (post.author.toString() === userId) {
      return res.status(200).json({ viewsCount: post.viewsCount, msg: 'יוצר הפוסט צופה - לא נספר' });
    }

    post.viewsCount += 1;
    await post.save();

    res.status(200).json({ viewsCount: post.viewsCount });
  } catch (error: any) {
    logger.error('Failed to increment post view count', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      organizationId: await getOrganizationIdForLog(req.body.userId),
      requestId: (req as any).requestId,
      postId: req.params.id,
    });
    res.status(500).json({ message: 'שגיאה בעדכון הצפיות' });
  }
};

export const searchSimilarPosts = async (req: Request, res: Response) => {
  try {
    const { postId, title } = req.query;

    // 1. יצירת מפתח ייחודי בזיכרון עבור הבקשה הזו
    const cacheKey = postId ? `similar:id:${postId}` : `similar:title:${title}`;

    // 2. בדיקה: האם ההמלצות לפוסט זה כבר קיימות בזיכרון המהיר?
    const cachedRecommendations = recommendationCache.get(cacheKey);
    if (cachedRecommendations) {
      return res.status(200).json(cachedRecommendations);
    }

    // 3. Cache Miss - המידע לא בזיכרון, נשלוף אותו מבסיס הנתונים:
    let searchEmbedding: number[] = [];

    // א) שליפת הווקטור המוכן מה-DB לפי ה-postId
    // .select() מביא רק את השדה שבאמת נחוץ (במקום כל מסמך הפוסט המלא -
    // תוכן, מצורפים, דירוגים וכו') ו-.lean() כי זו קריאה בלבד, בלי שמירה בהמשך
    if (postId) {
      const currentPost = await Post.findById(postId).select('titleEmbedding').lean();
      if (currentPost && currentPost.titleEmbedding && currentPost.titleEmbedding.length > 0) {
        searchEmbedding = currentPost.titleEmbedding;
      }
    }

    // ב) גיבוי לפוסטים ישנים: פנייה חד פעמית ל-OpenAI
    if (searchEmbedding.length === 0 && title && (title as string).length >= 3) {
      searchEmbedding = await getEmbedding(title as string);
    }

    // ג) הגנה: אם אין וקטור משום מקור, נחזיר מערך ריק מיד
    if (searchEmbedding.length === 0) {
      return res.status(200).json([]);
    }

    // ד) הרצת החיפוש הוקטורי ב-MongoDB Atlas
    const similar = await Post.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index', 
          path: 'titleEmbedding',
          queryVector: searchEmbedding,
          numCandidates: 10,
          limit: 4 
        }
      },
      {
        $project: {
          _id: 1,
          title: 1
        }
      }
    ]);

    // 4. שמירה ב-Cache: שומרים את התוצאה בזיכרון המהיר ל-30 דקות הבאות!
    recommendationCache.set(cacheKey, similar);

    // 5. החזרת התוצאה ל-React
    return res.status(200).json(similar);

  } catch (error: any) {
    logger.error('Failed to fetch semantically similar posts', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      postId: req.query.postId,
      title: req.query.title,
    });
    return res.status(500).json({
      message: 'שגיאה בחיפוש פוסטים דומים',
      error: error.message,
    });
  }
};

export const searchStrictSimilarPosts = async (req: Request, res: Response) => {
  try {
    const { title } = req.query;

    if (!title || (title as string).length < 3) {
      return res.status(200).json([]);
    }

    // בדיקת Cache לפני קריאה ל-OpenAI - בלי זה, כל הקלדה בתיבת החיפוש
    // (גם כשמדובר באותה כותרת בדיוק, למשל אם כמה משתמשים בודקים כותרת פופולרית)
    // הייתה מחייבת קריאה חדשה ל-OpenAI, גם אם כבר בדקנו את אותה כותרת בדקות האחרונות.
    const cacheKey = `strict-similar:${(title as string).trim().toLowerCase()}`;
    const cachedResult = recommendationCache.get(cacheKey);
    if (cachedResult) {
      return res.status(200).json(cachedResult);
    }

    // הפנייה ל-OpenAI לקבלת הווקטור של הכותרת החדשה
    const searchEmbedding = await getEmbedding(title as string);

    // הרצת החיפוש הוקטורי עם סינון קשיח (רף תאימות של 70%) עבור המודאל
    const similar = await Post.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index', 
          path: 'titleEmbedding',
          queryVector: searchEmbedding,
          numCandidates: 10,
          limit: 4 
        }
      },
      {
        $project: {
          _id: 1,
          title: 1,
          score: { $meta: "vectorSearchScore" } 
        }
      },
      {
        $match: {
          score: { $gte: 0.8 } // סינון קשיח: רק מה שבאמת דומה עובר
        }
      },
      {
        $project: {
          score: 0
        }
      }
    ]);

    recommendationCache.set(cacheKey, similar);

    return res.status(200).json(similar);

  } catch (error: any) {
    logger.error('Failed to fetch strict similar posts for modal', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      title: req.query.title,
    });
    return res.status(500).json({
      message: 'שגיאה בחיפוש פוסטים דומים למודאל',
      error: error.message,
    });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, fileUrl } = req.body;
    
    const authenticatedUserId = (req as any).user?.userId || req.body.userId;
    if (!authenticatedUserId) {
      return res.status(401).json({ message: "משתמש לא מחובר או לא מאומת" });
    }

    const finalTagIds: string[] = [];
    
    if (tags && Array.isArray(tags)) {
      for (const tagItem of tags) {
        const hasValidId = tagItem.id && tagItem.id.length === 24;
        const hasValidValue = tagItem.value && tagItem.value.length === 24;
        
        if (hasValidId || hasValidValue) {
          finalTagIds.push(tagItem.id || tagItem.value);
        } else {
          const newTagName = (tagItem.label || tagItem.name || tagItem.value || '').trim();

          if (newTagName) {
            const resolvedId = await resolveOrCreateTagByName(newTagName);
            if (resolvedId) finalTagIds.push(resolvedId);
          }
        }
      }
    }

    const newPost = new Post({
      title,
      content,
      category,
      tags: finalTagIds,
      attachments: fileUrl ? [fileUrl] : [], 
      author: authenticatedUserId,
      titleEmbedding: [] // יתעדכן ברקע מיד לאחר השמירה, בלי לעכב את התגובה למשתמשת
    });

    const savedPost = await newPost.save();
    invalidatePostsListCache();

    // יצירת ה-embedding מתבצעת ברקע (לא await) - כך המשתמשת מקבלת אישור מיידי
    // על יצירת הפוסט, בלי לחכות לזמן התגובה של OpenAI
    getEmbedding(title)
      .then((embedding) => Post.findByIdAndUpdate(savedPost._id, { titleEmbedding: embedding }))
      .catch(async (err: any) => {
        logger.error('Failed to update post titleEmbedding in background', {
          error: err.message,
          stack: err.stack,
          userId: authenticatedUserId,
          organizationId: await getOrganizationIdForLog(authenticatedUserId),
          requestId: (req as any).requestId,
          postId: savedPost._id,
        });
      });

    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name')
      .populate('tags', 'name')
      .lean();

    return res.status(201).json(populatedPost);

  } catch (error: any) {
    logger.error('Failed to create post', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId || req.body.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId || req.body.userId),
      requestId: (req as any).requestId,
      title: req.body.title,
      category: req.body.category,
    });
    return res.status(500).json({
      message: 'שגיאה פנימית ביצירת הפוסט',
      error: error.message,
    });
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { query, userRole } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'חובה לספק מילת חיפוש' });
    }

    const searchRegex = new RegExp(query as string, 'i');
    
    const matchingTags = await Tag.find({ name: searchRegex });
    const tagIds = matchingTags.map(t => t._id);

    const searchFilter: any = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: { $in: tagIds } }
      ]
    };

    if (userRole !== 'admin') {
      searchFilter.isBlocked = { $ne: true };
    }

    const postsWithDetails = await Post.aggregate(
      buildPostListPipeline(searchFilter)
    );

    res.status(200).json(postsWithDetails);
  } catch (error: any) {
    logger.error('Failed to search posts', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      query: req.query.query,
      userRole: req.query.userRole,
    });
    res.status(500).json({ message: 'שגיאה בביצוע החיפוש' });
  }
};
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId, content, userId, fileUrl } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'תוכן התגובה אינו יכול להיות ריק' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'הפוסט אליו את מנסה להגיב לא נמצא' });
    }

    const attachments = fileUrl ? [fileUrl] : [];

    const newComment = new Comment({
      postId,
      content,
      attachments, 
      author: userId || null
    });

    const savedComment = await newComment.save();
    
    const populatedComment = await Comment.findById(savedComment._id)
      .select('postId content attachments author createdAt')
      .populate('author', 'name');

    // עדכון lastActivity ברקע - לא חוסם את התגובה למשתמשת (שלא כמו לפני,
    // כשה-await כאן עיכב את השמירה על התגובה עצמה בכל הוספת תגובה)
    post.lastActivity = new Date();
    post.save({ validateBeforeSave: false })
      .then(() => invalidatePostsListCache())
      .catch(async (err: any) => {
        logger.error('Failed to update post lastActivity in background', {
          error: err.message,
          stack: err.stack,
          userId,
          organizationId: await getOrganizationIdForLog(userId),
          requestId: (req as any).requestId,
          postId,
        });
      });

    res.status(201).json(populatedComment);
  } catch (error: any) {
    logger.error('Failed to create comment', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      organizationId: await getOrganizationIdForLog(req.body.userId),
      requestId: (req as any).requestId,
      postId: req.body.postId,
    });
    res.status(500).json({ message: 'שגיאה בשמירת התגובה' });
  }
};

export const deleteCommentByAdmin = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body; 

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'אין לך הרשאה לבצע פעולה זו. מורשה למנהלים בלבד.' });
    }

    const comment = await Comment.findById(commentId).populate('author', 'name');
    if (!comment) return res.status(404).json({ message: 'התגובה לא נמצאה' });

    await Comment.findByIdAndDelete(commentId);

    await ModerationLog.create({
      action: 'DELETE_COMMENT',
      adminId: user._id,
      targetId: comment._id,
      details: `המנהל ${user.name} מחק את התגובה: "${comment.content.substring(0, 50)}..." שנכתבה על ידי ${(comment.author as unknown as { name?: string })?.name || 'אנונימי'}`
    });

    res.status(200).json({ message: 'התגובה נמחקה ותועדה בהצלחה' });
  } catch (error: any) {
    logger.error('Failed to delete comment as admin', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      organizationId: await getOrganizationIdForLog(req.body.userId),
      requestId: (req as any).requestId,
      commentId: req.params.commentId,
    });
    res.status(500).json({ message: 'שגיאה במחיקת התגובה' });
  }
};

export const moderatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; 
    const { userId, actionType } = req.body; 

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'פעולה זו מורשית למנהלי מערכת בלבד' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'הפוסט לא נמצא' });

    let logAction: any;
    let logDetails = '';

    if (actionType === 'block') {
      post.isBlocked = true;
      logAction = 'BLOCK_POST';
      logDetails = `המנהל ${user.name} חסם והסתיר את הפוסט: "${post.title}"`;
    } else if (actionType === 'unblock') {
      post.isBlocked = false;
      logAction = 'UNBLOCK_POST';
      logDetails = `המנהל ${user.name} ביטל את החסימה של הפוסט: "${post.title}"`;
    } else if (actionType === 'lock') {
      post.isLocked = true;
      logAction = 'LOCK_POST';
      logDetails = `המנהל ${user.name} נעל לתגובות את הפוסט: "${post.title}"`;
    } else if (actionType === 'unlock') {
      post.isLocked = false;
      logAction = 'UNLOCK_POST';
      logDetails = `המנהל ${user.name} שחרר מנעילה את הפוסט: "${post.title}"`;
    } else {
      return res.status(400).json({ message: 'סוג פעולה לא תקין' });
    }

    await post.save();
    invalidatePostsListCache();

    await ModerationLog.create({
      action: logAction,
      adminId: user._id,
      targetId: post._id,
      details: logDetails
    });

    res.status(200).json({ message: 'סטטוס הפוסט עודכן ותועד בהצלחה', post });
  } catch (error: any) {
    logger.error('Failed to moderate post', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      organizationId: await getOrganizationIdForLog(req.body.userId),
      requestId: (req as any).requestId,
      postId: req.params.id,
      actionType: req.body.actionType,
    });
    res.status(500).json({ message: 'שגיאה בעדכון סטטוס הפוסט' });
  }
};

export const ratePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; 
    const { userId, rating } = req.body; 

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(200).json({ message: 'No action taken' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const existingRatingIndex = post.ratedBy.findIndex(
      (r: { userId: mongoose.Types.ObjectId; score: number }) => r.userId.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      const existingRating = post.ratedBy[existingRatingIndex];
      if (existingRating) {
        const oldScore = existingRating.score;
        post.ratingSum = (post.ratingSum - oldScore) + ratingNum;
        existingRating.score = ratingNum;
      }
    } else {
      post.ratedBy.push({ userId, score: ratingNum });
      post.ratingCount += 1;
      post.ratingSum += ratingNum;
    }

    post.averageRating = Number((post.ratingSum / post.ratingCount).toFixed(1));

    await post.save();

    return res.status(200).json({
      averageRating: post.averageRating,
      ratingCount: post.ratingCount
    });
  } catch (error: any) {
    logger.error('Failed to rate post', {
      error: error.message,
      stack: error.stack,
      userId: req.body.userId,
      organizationId: await getOrganizationIdForLog(req.body.userId),
      requestId: (req as any).requestId,
      postId: req.params.id,
      rating: req.body.rating,
    });
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const generateAiAssistance = async (req: Request, res: Response) => {
  try {
    const { mode, content } = req.body;

    if (!content || content.trim().length < 15) {
      return res.status(400).json({ message: 'התוכן קצר מדי בשביל לקבל עזרת AI' });
    }

    if (mode === 'refine') {
      const refinedContent = await refineContent(content);
      return res.status(200).json({ refinedContent });

    } else if (mode === 'titles') {
      const titles = await suggestTitles(content);
      return res.status(200).json({ titles });

    } else if (mode === 'tags') {
      const tags = await suggestTags(content);
      return res.status(200).json({ tags });
    }

    return res.status(400).json({ message: 'מצב עבודה לא תקין' });

  } catch (error: any) {
    logger.error('Failed to generate AI assistance for post content', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).user?.userId,
      organizationId: await getOrganizationIdForLog((req as any).user?.userId),
      requestId: (req as any).requestId,
      mode: req.body.mode,
    });
    return res.status(500).json({ message: 'שגיאה פנימית בעיבוד ה-AI' });
  }
};