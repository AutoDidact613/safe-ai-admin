import { Router } from 'express';
import { getPosts, getPostById, createPost, incrementView, searchSimilarPosts,searchStrictSimilarPosts, searchPosts, createComment, deleteCommentByAdmin, moderatePost, ratePost, generateAiAssistance } from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';
const router = Router();

// הערה: אין יותר צורך ב-multer/diskStorage כאן.
// קבצים מצורפים לתגובות עולים ישירות ל-S3 מה-Frontend (בדיוק כמו בפוסטים),
// והשרת מקבל רק את ה-fileUrl הסופי בגוף הבקשה (JSON), לא קובץ בפועל.

router.get('/', getPosts);
router.get('/search', searchPosts);
router.get('/search-similar', searchSimilarPosts);
router.get('/search-strict-similar', searchStrictSimilarPosts);
router.post('/ai-assist', authenticateToken, generateAiAssistance);
router.post('/', authenticateToken, createPost);
router.post('/:id/rate', ratePost); // לדירוג פוסט
router.get('/:id', getPostById);
router.post('/:id/view', incrementView);

// כעת מגיע JSON רגיל עם fileUrl (הקובץ עצמו עלה כבר ישירות ל-S3 מה-Frontend)
router.post('/:id/comment', createComment);
router.delete('/comment/:commentId', deleteCommentByAdmin); // למחיקת תגובה
router.patch('/:id/moderation', moderatePost); // לחסימה/נעילה/ביטול חסימה של פוסט

export default router;