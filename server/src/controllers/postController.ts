import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Tag from '../models/Tag'; // ייבוא מודל התגיות החדש
import ModerationLog from '../models/ModerationLog';
import { User } from '../models/User';



export const getPosts = async (req: Request, res: Response) => {
  try {
    const { userRole } = req.query;

    let filterQuery: any = {};
    if (userRole !== 'admin') {
      filterQuery.isBlocked = { $ne: true };
    }
    
    // שליפה ומיון לפי הפעילות האחרונה (פוסט חדש או תגובה חדשה)
    const posts = await Post.find(filterQuery)
      .populate('author', 'name')
      .populate('tags', 'name')
      .sort({ lastActivity: -1 });

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      
      const lastComment = await Comment.findOne({ postId: post._id })
        .populate('author', 'name')
        .sort({ createdAt: -1 }); // מביא את התגובה הכי חדשה שנכתבה

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
    console.error('Error in getPosts:', error);
    res.status(500).json({ message: 'Error fetching posts', error });
  }
};

// 2. הבאת פוסט בודד + התגובות שלו (עבור השרשור המלא)
export const getPostById = async (req: Request, res: Response) => {
  try {
    // שדרוג: מאכלס את התגיות גם כשנכנסים לפוסט בודד
    const post = await Post.findById(req.params.id)
      .populate('author', 'name')
      .populate('tags', 'name');
      
    if (!post) return res.status(404).json({ message: 'הפוסט לא נמצא' });

    const comments = await Comment.find({ postId: req.params.id }).populate('author', 'name');
    res.status(200).json({ post, comments });
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בהבאת השרשור', error });
  }
};

// 3. עדכון צפיות חכם (מונע כפל צפיות ולא סופר את היוצר)
export const incrementView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; 

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'הפוסט לא נמצא' });

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

// 4. חיפוש פוסטים דומים בזמן אמת (לפי אותיות שהוקלדו בכותרת)
export const searchSimilarPosts = async (req: Request, res: Response) => {
  try {
    const { title } = req.query;
    if (!title || (title as string).length < 3) {
      return res.status(200).json([]);
    }

    const similar = await Post.find({
      title: { $regex: title as string, $options: 'i' }
    }).limit(3).select('title _id'); 

    res.status(200).json(similar);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בחיפוש פוסטים דומים', error });
  }
};

// 5. יצירת פוסט חדש - קליטת מערך ה-IDs והמילים החדשות מ-CreatableSelect
export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, userId } = req.body;
    
    const attachments = req.file ? [req.file.filename] : [];
    let finalTagIds: string[] = [];
    
    // פענוח של מערך התגיות המורכב שנשלח מה-React CreatableSelect
    if (tags) {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      
      if (Array.isArray(parsedTags)) {
        for (const tagItem of parsedTags) {
          // הגנה חכמה: בודקים האם ה-value/id הוא ID אמיתי של מונגו באורך 24 תווים
          const hasValidId = tagItem.id && tagItem.id.length === 24;
          const hasValidValue = tagItem.value && tagItem.value.length === 24;
          
          if (hasValidId || hasValidValue) {
            // אם קיים ID תקין, נשתמש בו ישירות
            finalTagIds.push(tagItem.id || tagItem.value);
          } else {
            // אם המשתמש הקליד מילה חדשה, השם של התגית ייקלח מ-label או מ-name
            const newTagName = (tagItem.label || tagItem.name || tagItem.value || '').trim();
            
            if (newTagName) {
              // נחפש במאגר הכללי האם התגית כבר קיימת (ללא תלות באותיות גדולות/קטנות)
              let existingTag = await Tag.findOne({ name: { $regex: new RegExp(`^${newTagName}$`, 'i') } });
              
              if (!existingTag) {
                // אם היא לא קיימת בכלל באלף המושגים - ניצור אותה אוטומטית!
                existingTag = await Tag.create({ name: newTagName });
              }
              finalTagIds.push(existingTag._id as string);
            }
          }
        }
      }
    }

    // יצירת הפוסט החדש בצורה מאובטחת
    const newPost = new Post({
      title,
      content,
      category,
      tags: finalTagIds, // שומר את מערך ה-IDs הנקי
      attachments, 
      author: userId
    });

    const savedPost = await newPost.save();
    
    // החזרת פוסט מאוכלס מלא ללקוח
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name')
      .populate('tags', 'name');

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error('Error in createPost controller:', error);
    res.status(500).json({ message: 'שגיאה פנימית ביצירת הפוסט', error: error instanceof Error ? error.message : error });
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

    // תיקון: הוספת .sort({ lastActivity: -1 }) כדי שגם בחיפוש הסדר יישמר
    const posts = await Post.find(searchFilter)
      .populate('author', 'name')
      .populate('tags', 'name')
      .sort({ lastActivity: -1 });

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      
      const lastComment = await Comment.findOne({ postId: post._id })
        .populate('author', 'name')
        .sort({ createdAt: -1 }); // תיקון: מיון לפי יצירת התגובה

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

    // בדיקה האם הפוסט קיים בכלל לפני שמגיבים לו
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
    const populatedComment = await Comment.findById(savedComment._id).populate('author', 'name');
    
    // עדכון שדה הפעילות האחרונה בפוסט לרגע הנוכחי ושמירתו
    post.lastActivity = new Date();
await post.save({ validateBeforeSave: false });    
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Error in createComment:', error);
    res.status(500).json({ message: 'שגיאה בשמירת התגובה', error });
  }
};

// 8. מחיקת תגובה על ידי מנהל מערכת + רישום פעולה
export const deleteCommentByAdmin = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body; // ה-ID של המשתמש שמנסה למחוק, נשלח מה-Frontend

    // אבטחה: בדיקה שהמשתמש קיים והוא אכן אדמין
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'אין לך הרשאה לבצע פעולה זו. מורשה למנהלים בלבד.' });
    }

    // שליפת התגובה כדי לשמור את התוכן שלה בלוג לפני שהיא נעלמת לתמיד
    const comment = await Comment.findById(commentId).populate('author', 'name');
    if (!comment) return res.status(404).json({ message: 'התגובה לא נמצאה' });

    // מחיקה פיזית ממסד הנתונים
    await Comment.findByIdAndDelete(commentId);

    // תיעוד הפעולה בקולקשן הלוגים (עבור קריטריון קבלה: "הפעולה נרשמת")
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

// 9. ניהול סטטוס פוסט (חסימה, נעילה, שחרור) על ידי מנהל מערכת
export const moderatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ה-ID של הפוסט
    const { userId, actionType } = req.body; // actionType יכול להיות: 'block', 'unblock', 'lock', 'unlock'

    // אבטחה: וידוא הרשאות אדמין
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'פעולה זו מורשית למנהלי מערכת בלבד' });
    }

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ message: 'הפוסט לא נמצא' });

    let logAction: any;
    let logDetails = '';

    // הפעלת השינוי בהתאם לבקשת האדמין
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

    // שמירת התיעוד בלוגים
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

    // 1. מחפשים את הדירוג הקודם של המשתמש הספציפי בתוך המערך
    const existingRatingIndex = post.ratedBy.findIndex(
      (r: any) => r.userId.toString() === userId
    );

    if (existingRatingIndex !== -1) {
      // 2. אם הוא כבר דירג בעבר:
      // מורידים מהסכום הכללי את הציון הישן והמדויק שלו, ומוסיפים את החדש
      const oldScore = post.ratedBy[existingRatingIndex].score;
      post.ratingSum = (post.ratingSum - oldScore) + ratingNum;
      
      // מעדכנים את הציון שלו במערך לציון החדש
      post.ratedBy[existingRatingIndex].score = ratingNum;
      
      // כמות המדרגים (ratingCount) נשארת זהה!
    } else {
      // 3. אם זה משתמש חדש שמדרג פעם ראשונה:
      post.ratedBy.push({ userId, score: ratingNum });
      post.ratingCount += 1;
      post.ratingSum += ratingNum;
    }

    // 4. חישוב הממוצע המדויק
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