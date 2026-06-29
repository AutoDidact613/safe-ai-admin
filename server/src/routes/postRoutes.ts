import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getPosts, getPostById, createPost, incrementView, searchSimilarPosts, searchPosts, createComment,deleteCommentByAdmin, moderatePost,ratePost } from '../controllers/postController';
const router = Router();

// הגדרת Multer לשמירת קבצים
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', getPosts);
router.get('/search', searchPosts); 
router.get('/search-similar', searchSimilarPosts);
router.post('/:id/rate', ratePost); // לדירוג פוסט
router.get('/:id', getPostById);
router.post('/', upload.single('file'), createPost);
router.post('/:id/view', incrementView);

// פתרון: הוספת upload.single('file') כדי שהשרת יקלוט קבצים ותוכן שנשלחים מתגובות
router.post('/:id/comment', upload.single('file'), createComment);
router.delete('/comment/:commentId', deleteCommentByAdmin); // למחיקת תגובה
router.patch('/:id/moderation', moderatePost); // לחסימה/נעילה/ביטול חסימה של פוסט

export default router;