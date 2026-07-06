import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Tag from '../models/Tag'; 
import ModerationLog from '../models/ModerationLog';
import { User } from '../models/User';
import { OpenAI } from 'openai'; 
import NodeCache from 'node-cache'; // ייבוא תקין של ה-Cache בשרת
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// אתחול זיכרון המטמון הגלובלי בשרת
const recommendationCache = new NodeCache({ stdTTL: 1800, checkperiod: 60 });
const s3Client = new S3Client({ region: process.env.AWS_REGION });


/**
 * פונקציית עזר להפיכת טקסט לוקטור מספרי באמצעות OpenAI
 */
async function getEmbedding(text: string): Promise<number[]> {
  try {
    // אתחול דינמי שמבטיח קריאה ישירה של המפתח המעודכן ביותר מ-process.env
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

/**
 * בונה pipeline אגרגציה יחיד שמחזיר פוסטים כולל: שם הכותב, תגיות,
 * מספר תגובות ופרטי התגובה האחרונה - הכול בשאילתה אחת למסד הנתונים
 * (במקום שאילתה נפרדת לכל פוסט כמו שהיה קודם).
 *
 * skip/limit הם אופציונליים: אם לא מועברים, לא מתבצע דילוג/הגבלה (למסך חיפוש למשל).
 */
function buildPostListPipeline(matchStage: Record<string, any>, skip?: number, limit?: number) {
  const pipeline: any[] = [
    { $match: matchStage },
    { $sort: { lastActivity: -1 } },
  ];

  if (typeof skip === 'number') pipeline.push({ $skip: skip });
  if (typeof limit === 'number') pipeline.push({ $limit: limit });

  pipeline.push(
    // חיבור פרטי כותב הפוסט (author) - מחליף את populate('author', 'name')
    // ה-pipeline מגביל את השדות שמוחזרים לשם בלבד, כדי לא לחשוף שדות רגישים
    // (כמו סיסמה מוצפנת/אימייל) ולא להעביר ברשת יותר מידע מהנדרש
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'author'
      }
    },
    { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },

    // חיבור התגיות - מחליף את populate('tags', 'name')
    {
      $lookup: {
        from: 'tags',
        localField: 'tags',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1 } }],
        as: 'tags'
      }
    },

    // חיבור כל התגובות של הפוסט (עם שם כותב כל תגובה), כדי לחשב מהן
    // בתוך מסד הנתונים גם ספירה וגם את התגובה האחרונה - בלי שאילתות נפרדות
    {
      $lookup: {
        from: 'comments',
        let: { postId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'author',
              foreignField: '_id',
              as: 'author'
            }
          },
          { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
          { $project: { content: 1, 'author.name': 1 } }
        ],
        as: 'comments'
      }
    },

    // חישוב commentCount ו-lastComment מתוך מערך התגובות שחיברנו
    {
      $addFields: {
        commentCount: { $size: '$comments' },
        lastComment: {
          $cond: [
            { $gt: [{ $size: '$comments' }, 0] },
            {
              authorName: { $ifNull: [{ $arrayElemAt: ['$comments.author.name', 0] }, 'משתמש'] },
              content: { $arrayElemAt: ['$comments.content', 0] }
            },
            null
          ]
        }
      }
    },

    // מסירים את מערך התגובות המלא - השדות commentCount/lastComment מכילים את מה שצריך
    { $project: { comments: 0 } }
  );

  return pipeline;
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

    // 3. שליפת הפוסטים + author + tags + commentCount + lastComment בשאילתה אחת
    const postsWithDetails = await Post.aggregate(
      buildPostListPipeline(filterQuery, skip, limit)
    );

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

async function generatePresignedDownloadUrl(fileKey: string): Promise<string> {
  try {
    if (!fileKey) return '';
    
    // אם הקישור כבר מכיל חתימה בתוקף, אין צורך לחתום עליו שוב
    if (fileKey.startsWith('http') && fileKey.includes('X-Amz-Signature')) return fileKey;
    
    // תיקון חכם: חילוץ שם הקובץ האמיתי מתוך ה-URL המלא של S3
    // מוחק את כל הכתובת של ה-Bucket ונשאר רק עם ה-Key (שם הקובץ והסיומת שלו)
    let key = fileKey;
    if (fileKey.startsWith('http')) {
      // לוקח את החלק האחרון אחרי הסלאש, ומוריד פרמטרים של סימן שאלה אם יש
      const urlObj = new URL(fileKey);
      key = urlObj.pathname.substring(1); // מוריד את הסלאש הראשון
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: decodeURIComponent(key), // הגנה למקרה שיש רווחים או עברית בשם הקובץ
    });

    // יצירת הקישור הזמני ל-15 דקות
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
  } catch (error) {
    console.error("Error generating presigned download URL:", error);
    return fileKey; 
  }
}
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
      post.attachments = await Promise.all(
        post.attachments.map(fileKey => generatePresignedDownloadUrl(fileKey))
      );
    }

    // שליפת התגובות לפוסט
    const comments = await Comment.find({ postId: req.params.id }).populate('author', 'name').lean();

    // 3. חתימה דינמית על קבצי התגובות מול S3 (במידה וקיימים)
    // מקביל על כל התגובות בבת אחת, במקום תגובה-אחר-תגובה ברצף (שהיה מאט
    // ליניארית ככל שיש יותר תגובות עם קבצים מצורפים לפוסט)
    await Promise.all(
      comments.map(async (comment) => {
        if (comment.attachments && comment.attachments.length > 0) {
          comment.attachments = await Promise.all(
            comment.attachments.map(fileKey => generatePresignedDownloadUrl(fileKey))
          );
        }
      })
    );

    // 4. החזרת המידע החתום והטרי ל-React
    return res.status(200).json({ post, comments });

  } catch (error) {
    console.error('Error in getPostById with presigned URLs:', error);
    return res.status(500).json({ 
      message: 'שגיאה בהבאת השרשור והקבצים המאובטחים', 
      error: error instanceof Error ? error.message : error 
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

  } catch (error) {
    console.error('Error in searchStrictSimilarPosts:', error);
    return res.status(500).json({ 
      message: 'שגיאה בחיפוש פוסטים דומים למודאל', 
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

    // יצירת ה-embedding מתבצעת ברקע (לא await) - כך המשתמשת מקבלת אישור מיידי
    // על יצירת הפוסט, בלי לחכות לזמן התגובה של OpenAI
    getEmbedding(title)
      .then((embedding) => Post.findByIdAndUpdate(savedPost._id, { titleEmbedding: embedding }))
      .catch((err) => console.error('Error updating titleEmbedding in background:', err));

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

    const postsWithDetails = await Post.aggregate(
      buildPostListPipeline(searchFilter)
    );

    res.status(200).json(postsWithDetails);
  } catch (error) {
    console.error('Error in searchPosts:', error);
    res.status(500).json({ message: 'שגיאה בביצוע החיפוש', error });
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
export const generateAiAssistance = async (req: Request, res: Response) => {
  try {
    const { mode, content } = req.body;

    if (!content || content.trim().length < 15) {
      return res.status(400).json({ message: 'התוכן קצר מדי בשביל לקבל עזרת AI' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (mode === 'refine') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: 'אתה עוזר עריכה מקצועי בפורום פיתוח תוכנה. תפקידך לשפר את הניסוח, לתקן שגיאות כתיב בעברית, ולסדר קטעי קוד בתוך בלוקים מתאימים של Markdown. אל תוסיף מידע חדש ואל תאריך את הפוסט סתם.'
          },
          {
            role: 'user',
            content: `אנא שפר את הניסוח של הטקסט הבא והחזר לי רק את הטקסט המעובד והמשופר: \n\n${content}`
          }
        ]
      });
      return res.status(200).json({ refinedContent: response.choices[0].message.content?.trim() });

} else if (mode === 'titles') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: 'אתה עוזר כתיבה לפורום טכנולוגי. החזר אך ורק אובייקט JSON תקין (ללא סימני Markdown מסביב).'
          },
          {
            role: 'user',
            content: `נתח את הטקסט הבא והצע לו 3 אופציות לכותרות קצרות ומושכות בעברית המתאימות לפוסט. החזר מבנה JSON בדיוק כך: {"titles": ["אופציה 1", "אופציה 2", "אופציה 3"]}. הנה הטקסט: \n\n${content}`
          }
        ],
        response_format: { type: 'json_object' }
      });
      const data = JSON.parse(response.choices[0].message.content || '{}');
      
      // תיקון: מחזיר ישירות את המערך מתוך ה-JSON כדי להתאים לציפיות של ה-React
      return res.status(200).json({ titles: data.titles || [] });

    } else if (mode === 'tags') {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 60, // קצר וחסכוני יותר
        messages: [
          {
            role: 'system',
            content: 'אתה עוזר מקצועי לייצור תגיות נושא עבור פורום. תפקידך לחלץ מהטקסט עד 3 מילות מפתח קצרות, מדויקות ורלוונטיות ביותר המייצגות את לב הנושא (בעברית או באנגלית). עליך להחזיר אך ורק אובייקט JSON תקין ומדויק בפורמט הבא: {"tags": ["תגית1", "תגית2", "תגית3"]}, ללא סימני Markdown וללא שום טקסט נלווה.'
          },
          {
            role: 'user',
            content: `חלץ עד 3 תגיות נושא מתאימות עבור הטקסט הבא: \n\n${content}`
          }
        ],
        response_format: { type: 'json_object' }
      });
      const data = JSON.parse(response.choices[0].message.content || '{}');
      
      // החזרת המערך המפורסר ישירות ל-React
      return res.status(200).json({ tags: data.tags || [] });
    }

    return res.status(400).json({ message: 'מצב עבודה לא תקין' });

  } catch (error) {
    console.error('Error in generateAiAssistance:', error);
    return res.status(500).json({ message: 'שגיאה פנימית בעיבוד ה-AI' });
  }
};