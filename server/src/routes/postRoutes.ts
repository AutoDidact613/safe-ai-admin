import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getPosts, getPostById, createPost, incrementView, searchSimilarPosts, searchPosts, createComment } from '../controllers/postController';

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
router.get('/:id', getPostById);
router.post('/', upload.single('file'), createPost);

// פתרון: הוספת upload.single('file') כדי שהשרת יקלוט קבצים ותוכן שנשלחים מתגובות
router.post('/:id/comment', upload.single('file'), createComment);

export default router;