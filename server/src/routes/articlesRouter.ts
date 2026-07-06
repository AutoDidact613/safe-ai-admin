import { Router, Request, Response } from "express";
import { Article } from "../models/article";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import logger from "../logger";

const router = Router();

// GET /articles — public list of published articles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const articles = await Article.find({ published: true })
      .select("title slug description category createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, articles });
  } catch (err) {
    logger.error("Failed to fetch articles", err);
    res.status(500).json({ success: false, message: "שגיאה בטעינת המאמרים" });
  }
});

// GET /articles/all — admin: all articles including unpublished
router.get("/all", authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 });
    res.json({ success: true, articles });
  } catch (err) {
    logger.error("Failed to fetch all articles", err);
    res.status(500).json({ success: false, message: "שגיאה בטעינת המאמרים" });
  }
});

// GET /articles/:slug — public single article
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug as string, published: true });
    if (!article) {
      res.status(404).json({ success: false, message: "מאמר לא נמצא" });
      return;
    }
    res.json({ success: true, article });
  } catch (err) {
    logger.error("Failed to fetch article", err);
    res.status(500).json({ success: false, message: "שגיאה בטעינת המאמר" });
  }
});

// POST /articles — admin: create article
router.post("/", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, slug, content, description, category, published } = req.body;
    if (!title || !slug || !content) {
      res.status(400).json({ success: false, message: "כותרת, slug ותוכן הם שדות חובה" });
      return;
    }
    const article = await Article.create({ title, slug, content, description, category, published });
    res.status(201).json({ success: true, article });
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "11000") {
      res.status(409).json({ success: false, message: "Slug כבר קיים" });
      return;
    }
    logger.error("Failed to create article", err);
    res.status(500).json({ success: false, message: "שגיאה ביצירת המאמר" });
  }
});

// PUT /articles/:slug — admin: update article
router.put("/:slug", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const article = await Article.findOneAndUpdate(
      { slug },
      { $set: req.body },
      { new: true }
    );
    if (!article) {
      res.status(404).json({ success: false, message: "מאמר לא נמצא" });
      return;
    }
    res.json({ success: true, article });
  } catch (err) {
    logger.error("Failed to update article", err);
    res.status(500).json({ success: false, message: "שגיאה בעדכון המאמר" });
  }
});

// DELETE /articles/:slug — admin: delete article
router.delete("/:slug", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const article = await Article.findOneAndDelete({ slug });
    if (!article) {
      res.status(404).json({ success: false, message: "מאמר לא נמצא" });
      return;
    }
    res.json({ success: true, message: "המאמר נמחק" });
  } catch (err) {
    logger.error("Failed to delete article", err);
    res.status(500).json({ success: false, message: "שגיאה במחיקת המאמר" });
  }
});

export default router;
