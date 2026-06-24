import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getPosts, getPostById, createPost, incrementView, searchSimilarPosts } from '../controllers/postController';

const router = Router();

// הגדרת המקום שבו יישמרו הקבצים הפיזיים בשרת
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // הקבצים יישמרו בתיקיית uploads בשרת
  },
  filename: (req, file, cb) => {
    // שומר את הקובץ עם השם המקורי שלו + חותמת זמן כדי שלא יהיו כפילויות
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', getPosts);
router.get('/search-similar', searchSimilarPosts); 
router.get('/:id', getPostById);

// שינוי נתיב ה-POST: הוספת upload.single('file') כדי שידע לקלוט קובץ מהטופס
router.post('/', upload.single('file'), createPost);

router.post('/:id/view', incrementView);

export default router;