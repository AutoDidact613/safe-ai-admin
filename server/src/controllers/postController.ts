import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';

// 1. הבאת כל הפוסטים + ספירת תגובות דינמית עבור כל פוסט
export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await Post.find().populate('author', 'name').sort({ createdAt: -1 });
    
    const postsWithCommentCount = await Promise.all(posts.map(async (post) => {
      const commentCount = await Comment.countDocuments({ postId: post._id });
      return { ...post.toObject(), commentCount };
    }));

    res.status(200).json(postsWithCommentCount);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בהבאת הפוסטים', error });
  }
};

// 2. הבאת פוסט בודד + התגובות שלו (עבור השרשור המלא)
export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name');
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

// 5. יצירת פוסט חדש - תוקן המבנה וקליטת קבצים מ-Multer
export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, userId } = req.body;
    
    // אם המשתמש העלה קובץ, נשמור את השם הייחודי שלו במערך
    const attachments = req.file ? [req.file.filename] : [];

    const newPost = new Post({
      title,
      content,
      category,
      tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(t => t !== '') : [],
      attachments, 
      author: userId
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ message: 'שגיאה ביצירת הפוסט', error });
  }
};