import { Request, Response } from 'express';
import * as contactMessageService from '../services/contactMessageService';

// פונקציה להחזרת כל הפניות של המשתמש המחובר
export const getMyRequests = async (req: any, res: Response) => {
  try {
    // השגת ה-ID של המשתמש מתוך האובייקט שנוצר ב-Middleware של האותנטיקציה
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "משתמש לא מזוהה" });
    }
    
    // קריאה לשירות שכתבנו
    const requests = await contactMessageService.getRequestsByUserId(userId);
    
    // החזרת הנתונים ללקוח
    res.status(200).json(requests);
  } catch (error) {
    // טיפול בשגיאה במידה והתהליך נכשל
    res.status(500).json({ message: "שגיאה בטעינת הפניות האישיות" });
  }
};

export const getRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    // כאן אנחנו קוראים לפונקציה בשירות שצריך להוסיף
    const request = await contactMessageService.getRequestById(id);
    
    if (!request) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }
    
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "שגיאה בטעינת פרטי הפנייה" });
  }
};