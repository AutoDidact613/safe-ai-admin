import { Router } from "express";
import { getPresignedUrl } from "../controllers/uploadController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// הגדרת הנתיב לקבלת הקישור החתום - דורש התחברות, כדי שלא כל אחד (גם בלי
// חשבון) יוכל לבקש קישורי העלאה ל-S3 בלי הגבלה
router.post("/get-url", authenticateToken, getPresignedUrl);

export default router;