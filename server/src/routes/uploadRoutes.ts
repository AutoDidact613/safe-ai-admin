import { Router } from "express";
import { getPresignedUrl } from "../controllers/uploadController";

const router = Router();

// הגדרת הנתיב לקבלת הקישור החתום
router.post("/get-url", getPresignedUrl);

export default router;