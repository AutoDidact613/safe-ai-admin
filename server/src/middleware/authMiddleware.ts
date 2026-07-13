import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// הרחבת הטיפוסים של Express כדי שהקומפיילר יזהה את req.user ללא שגיאות
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // 1. שליפת ה-token מתוך הקוקיז שנקראו בזכות ה-cookie-parser
  const token = req.cookies.jwt; 

  if (!token) {
    return res.status(401).json({ message: 'משתמש לא מחובר, הגישה חסומה' });
  }

  try {
    // 2. אימות ה-Token באמצעות המפתח הסודי שלך מה- .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    
    // 3. הזרקת ה-ID לתוך אובייקט הבקשה
    req.user = { id: decoded.id }; 
    
    // ממשיכים לפונקציה הבאה (ל-Controller)
    next(); 
  } catch (err) {
    return res.status(401).json({ message: 'התחברות פגה תוקף או שגויה' });
  }
};