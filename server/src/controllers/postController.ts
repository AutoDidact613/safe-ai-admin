import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Tag from '../models/Tag'; // ייבוא מודל התגיות החדש

// 1. הבאת כל הפוסטים + ספירת תגובות דינמית + תגובה אחרונה (פרוג) + פופולייט לתגיות הפוסט
export const getPosts = async (req: Request, res: Response) => {
  try {
    // שדרוג: הוספת .populate('tags', 'name') ישירות על הפוסט
    const posts = await Post.find()
      .populate('author', 'name')
      .populate('tags', 'name')
      .sort({ createdAt: -1 });
    
    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      
      // שליפת התגובה האחרונה שנכתבה עבור פוסט זה
      const lastComment = await Comment.findOne({ postId: post._id })
        .populate('author', 'name')
        .sort({ createdAt: -1 }); // -1 מביא את הכי חדשה

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

// 5. יצירת פוסט חדש - תוקן לחלוטין לקליטת מערך ה-IDs והמילים החדשות מ-CreatableSelect
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

// 6. חיחיפוש פוסטים כללי בפורום - מתוקן עם תמיכה מלאה בתגיות וספירת תגובות
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'חובה לספק מילת חיפוש' });
    }

    const searchRegex = new RegExp(query as string, 'i');
    
    // שדרוג: חיפוש תגיות תואמות כדי לאפשר סינון גם לפי שם התגית בלחיצה
    const matchingTags = await Tag.find({ name: searchRegex });
    const tagIds = matchingTags.map(t => t._id);

    const searchFilter = {
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: { $in: tagIds } } // מאפשר סינון פוסטים לפי תגית כשלוחצים עליה!
      ]
    };

    // שדרוג: הוספת populate('tags', 'name')
    const posts = await Post.find(searchFilter)
      .populate('author', 'name')
      .populate('tags', 'name');

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

// 7. הוספת תגובה חדשה לשרשור פוסט קיים
export const createComment = async (req: Request, res: Response) => {
  try {
    const { postId, content, userId } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'תוכן התגובה אינו יכול להיות ריק' });
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

    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בשמירת התגובה', error });
  }
};