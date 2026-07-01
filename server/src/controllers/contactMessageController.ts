import { Request, Response } from 'express';
import * as contactMessageService from '../services/contactMessageService';
import { ContactMessage } from '../models/ContactMessage';

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
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === "admin";

    const request = await contactMessageService.getRequestById(id);

    if (!request) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    if (!isAdmin && request.userId?.toString() !== userId) {
      return res.status(403).json({ message: "אין לך גישה לפנייה זו" });
    }

    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "שגיאה בטעינת פרטי הפנייה" });
  }
};

export const closeRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const isAdmin = req.user?.role === "admin";

    if (!userId) {
      return res.status(401).json({ message: "משתמש לא מזוהה" });
    }

    const existingRequest = await contactMessageService.getRequestById(id);

    if (!existingRequest) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    if (!isAdmin && existingRequest.userId?.toString() !== userId) {
      return res.status(403).json({ message: "אין לך גישה לסגור פנייה זו" });
    }

    const request = await contactMessageService.closeRequestById(id, userId, isAdmin);

    if (!request) {
      return res.status(404).json({ message: "פנייה לא נמצאה" });
    }

    res.status(200).json({ success: true, message: "הפנייה נסגרה בהצלחה", request });
  } catch (error) {
    res.status(500).json({ message: "שגיאה בסגירת הפנייה" });
  }
};

export const deleteRequestById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const deletedRequest = await contactMessageService.deleteRequestById(id);

    if (!deletedRequest) {
      return res.status(404).json({ message: "פנייה לא נמצאה למחיקה" });
    }

    res.status(200).json({ success: true, message: "הפנייה נמחקה בהצלחה" });
  } catch (error) {
    res.status(500).json({ message: "שגיאה במחיקת הפנייה" });
  }
};

export const addReply = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?.userId || req.user?.id;
   
    const senderRole = req.user?.role || 'user'; 

    if (!userId) return res.status(401).json({ message: "משתמש לא מזוהה" });

    const request = await contactMessageService.addReplyToRequest(id, userId, text, senderRole);

    if (!request) return res.status(404).json({ message: "פנייה לא נמצאה" });

    res.status(200).json({ success: true, message: "התגובה נוספה בהצלחה", request });
  } catch (error) {
    res.status(500).json({ message: "שגיאה בהוספת התגובה" });
  }
};

export const getAllRequests = async (req: any, res: Response) => {
  try {
    // הוספת populate כדי לקבל את פרטי המשתמש השולח
    const allRequests = await ContactMessage.find()
      .populate('userId', 'name email') 
      .sort({ createdAt: -1 });
      
    res.status(200).json(allRequests);
  } catch (error) {
    res.status(500).json({ message: "שגיאה בטעינת כל הפניות" });
  }
};