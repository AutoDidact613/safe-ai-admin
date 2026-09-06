import { Router } from "express";
import { newsController } from "../controllers/newsController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const newsRouter = Router();

// ===== Public (everyone can read) =====
newsRouter.get("/", newsController.getAllNews);
// Must be registered before "/:id" - otherwise Express matches "tags" as an id
newsRouter.get("/tags", newsController.getAllTags);
newsRouter.get("/:id", newsController.getNewsById);

// ===== Admin only =====
newsRouter.post(
  "/",
  authenticateToken,
  requireAdmin,
  newsController.createNews
);

newsRouter.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  newsController.updateNews
);

newsRouter.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  newsController.deleteNews
);

export default newsRouter;