import { Router, Request, Response } from 'express';
import Tag from '../models/Tag'; // ודאי שהנתיב למודל ה-Tag שלך מדויק

const router = Router();

// נתיב להבאת כל התגיות מהמאגר
router.get('/', async (req: Request, res: Response) => {
  try {
    // מביא את כל התגיות וממיין אותן לפי הא'-ב' (שיהיה נוח למשתמש)
    const tags = await Tag.find().sort({ name: 1 });
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ message: 'שגיאה בהבאת התגיות מהמאגר', error });
  }
});

export default router;