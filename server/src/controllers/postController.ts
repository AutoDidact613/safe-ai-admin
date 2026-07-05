import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Tag from '../models/Tag'; 
import ModerationLog from '../models/ModerationLog';
import { User } from '../models/User';
import { OpenAI } from 'openai'; 
import NodeCache from 'node-cache'; // ייבוא תקין של ה-Cache בשרת

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// אתחול זיכרון המטמון הגלובלי בשרת
const recommendationCache = new NodeCache({ stdTTL: 1800, checkperiod: 60 });

/**
 * פונקציית עזר להפיכת טקסט לוקטור מספרי באמצעות OpenAI
 */
async function getEmbedding(text: string): Promise<number[]> {
  try {
    // אתחול דינמי שמבטיח קריאה ישירה של המפתח המעודכן ביותר מ-process.env
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // הדפסת אבטחה קצרה לטרמינל כדי לוודא סופית איזה מפתח נטען בפועל
    console.log("OpenAI Key check (first 10 chars):", process.env.OPENAI_API_KEY?.substring(0, 10) + "...");

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI Embedding Error:', error);
    throw new Error('Failed to generate embedding from OpenAI');
  }
}

export const getPosts = async (req: Request, res: Response) => {
  try {
    const { userRole } = req.query;
    
    // 1. קריאת העמוד הנוכחי מה-Query Parameters (ברירת מחדל: עמוד 1)
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10; // הגדרה קבועה של 10 פוסטים לעמוד
    const skip = (page - 1) * limit; // חישוב כמה פוסטים לדלג עליהם

    let filterQuery: any = {};
    if (userRole !== 'admin') {
      filterQuery.isBlocked = { $ne: true };
    }
    
    // 2. קבלת המספר הכולל של הפוסטים במערכת לצורך חישוב כמות העמודים
    const totalPosts = await Post.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalPosts / limit);

    // 3. שליפת הפוסטים הרלוונטיים בלבד לעמוד הנוכחי
    const posts = await Post.find(filterQuery)
      .populate('author', 'name')
      .populate('tags', 'name')
      .sort({ lastActivity: -1 })
      .skip(skip)   // דילוג על הפוסטים של העמודים הקודמים
      .limit(limit); // הגבלה ל-10 פוסטים בלבד

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      
      const lastComment = await Comment.findOne({ postId: post._id })
        .populate('author', 'name')
        .sort({ createdAt: -1 }); 

      return { 
        ...post.toObject(), 
        commentCount,
        lastComment: lastComment ? {
          authorName: lastComment.author?.name || 'משתמש',
          content: lastComment.content
        } : null
      };
    }));

    // 4. החזרת הפוסטים יחד עם נתוני העמודים ל-Frontend
    res.status(200).json({
      posts: postsWithDetails,
      currentPage: page,
      totalPages: totalPages,
      totalPosts: totalPosts
    });

  } catch (error) {
    console.error('Error in getPosts:', error);
    res.status(500).json({ message: 'Error fetching posts', error });
  }
};
export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name')
      .populate('tags', 'name');
      
    if (!post) {
      return res.status(404).json({ message: 'הפוסט לא נמצא' });
    }

    const comments = await Comment.find({ postId: req.params.id }).populate('author', 'name');
    res.status(200).json({ post, comments });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בהבאת השרשור', error });
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
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בעדכון הצפיות', error });
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
    if (postId) {
      const currentPost = await Post.findById(postId);
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

  } catch (error) {
    console.error('Error in semantic searchSimilarPosts with Cache:', error);
    return res.status(500).json({ 
      message: 'שגיאה בחיפוש פוסטים דומים', 
      error: error instanceof Error ? error.message : error 
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

    let finalTagIds: string[] = [];
    
    if (tags && Array.isArray(tags)) {
      for (const tagItem of tags) {
        const hasValidId = tagItem.id && tagItem.id.length === 24;
        const hasValidValue = tagItem.value && tagItem.value.length === 24;
        
        if (hasValidId || hasValidValue) {
          finalTagIds.push(tagItem.id || tagItem.value);
        } else {
          const newTagName = (tagItem.label || tagItem.name || tagItem.value || '').trim();
          
          if (newTagName) {
            let existingTag = await Tag.findOne({ name: { $regex: new RegExp(`^${newTagName}$`, 'i') } });
            
            if (!existingTag) {
              existingTag = await Tag.create({ name: newTagName });
            }
            finalTagIds.push(existingTag._id as string);
          }
        }
      }
    }

    const embedding = await getEmbedding(title);

    const newPost = new Post({
      title,
      content,
      category,
      tags: finalTagIds,
      attachments: fileUrl ? [fileUrl] : [], 
      author: authenticatedUserId,
      titleEmbedding: embedding 
    });

    const savedPost = await newPost.save();
    
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name')
      .populate('tags', 'name');

    return res.status(201).json(populatedPost);

  } catch (error) {
    console.error('Error in createPost controller:', error);
    return res.status(500).json({ 
      message: 'שגיאה פנימית ביצירת הפוסט', 
      error: error instanceof Error ? error.message : error 
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

    let searchFilter: any = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: { $in: tagIds } }
      ]
    };

    if (userRole !== 'admin') {
      searchFilter.isBlocked = { $ne: true };
    }

    const posts = await Post.find(searchFilter)
      .populate('author', 'name')
      .populate('tags', 'name')
      .sort({ lastActivity: -1 });

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      
      const lastComment = await Comment.findOne({ postId: post._id })
        .populate('author', 'name')
        .sort({ createdAt: -1 }); 

      return { 
        ...post.toObject(), 
        commentCount,
        lastComment: lastComment ? {
          authorName: lastComment.author?.name || 'משתמש',
          content: lastComment.content
        } : null
      };
    }));

    res.status(200).json(postsWithDetails);
  } catch (error) {
    console.error('Error in searchPosts:', error);
    res.status(500).json({ message: 'שגיאה בביצוע החיפוש', error });
  }
};
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId, content, userId } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'תוכן התגובה אינו יכול להיות ריק' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'הפוסט אליו את מנסה להגיב לא נמצא' });
    }

    const attachments = req.file ? [req.file.filename] : [];

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
    
    post.lastActivity = new Date();
    await post.save({ validateBeforeSave: false });    
    
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error in createComment:', error);
    res.status(500).json({ message: 'שגיאה בשמירת התגובה', error });
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
      details: `המנהל ${user.name} מחק את התגובה: "${comment.content.substring(0, 50)}..." שנכתבה על ידי ${comment.author?.name || 'אנונימי'}`
    });

    res.status(200).json({ message: 'התגובה נמחקה ותועדה בהצלחה' });
  } catch (error) {
    console.error('Error in deleteCommentByAdmin:', error);
    res.status(500).json({ message: 'שגיאה במחיקת התגובה', error });
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

    await ModerationLog.create({
      action: logAction,
      adminId: user._id,
      targetId: post._id,
      details: logDetails
    });

    res.status(200).json({ message: 'סטטוס הפוסט עודכן ותועד בהצלחה', post });
  } catch (error) {
    console.error('Error in moderatePost:', error);
    res.status(500).json({ message: 'שגיאה בעדכון סטטוס הפוסט', error });
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
      (r: any) => r.userId.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      const oldScore = post.ratedBy[existingRatingIndex].score;
      post.ratingSum = (post.ratingSum - oldScore) + ratingNum;
      post.ratedBy[existingRatingIndex].score = ratingNum;
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
  } catch (error) {
    console.error('Error in ratePost:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};