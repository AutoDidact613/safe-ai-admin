import express from "express";
import {
  createTenderHandler,
  listTendersHandler,
  getTenderHandler,
  updateTenderHandler,
  deleteTenderHandler,
  applyToTenderHandler,
  listAIApplicationTypes,
  listProductTypes,
} from "../controllers/tenderBoardController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

router.use(authenticateToken);

// Static data endpoints
router.get("/product-types", listProductTypes);
router.get("/ai-application-types", listAIApplicationTypes);

// CRUD
router.post("/", createTenderHandler);
router.get("/", listTendersHandler);
router.get("/:id", getTenderHandler);
router.put("/:id", updateTenderHandler);
router.patch("/:id", updateTenderHandler);
router.delete("/:id", deleteTenderHandler);
router.post("/:id/apply", applyToTenderHandler);

export default router;