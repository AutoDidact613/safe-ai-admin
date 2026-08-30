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
  createSmartTenderHandler,
  smartSearchTendersHandler,
  closeTenderHandler,
  viewTenderOffersHandler,
  getTenderAgentContextHandler,
  saveTenderSpecificationHandler,
  requestTenderSpecificationHandler,
  publishTenderSpecificationHandler,
} from "../controllers/tenderBoardController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = express.Router();

router.use(authenticateToken);

// Static data endpoints
router.get("/product-types", listProductTypes);
router.get("/ai-application-types", listAIApplicationTypes);

// CRUD

//AI
router.post("/smart-create", createSmartTenderHandler);
router.get("/smart-search", smartSearchTendersHandler);

router.post("/", createTenderHandler);
router.get("/", listTendersHandler);
router.get("/:id", getTenderHandler);
router.put("/:id", updateTenderHandler);
router.patch("/:id/close", closeTenderHandler);
router.patch("/:id/view-offers", viewTenderOffersHandler);
router.delete("/:id", deleteTenderHandler);
router.post("/:id/apply", applyToTenderHandler);

// אפיון אוטומטי + המלצת פיתוח (SCRUM-287/291/293)
// שני אלה agent-facing בלבד - טוקן שירות (JWT אדמין), כמו אצל inquiry-agent/log-agent
router.get("/:id/agent-context", requireAdmin, getTenderAgentContextHandler);
router.post("/:id/specification", requireAdmin, saveTenderSpecificationHandler);
// אלה מופעלים מה-UI ע"י בעל המכרז/אדמין (נבדק בתוך ה-handler עצמו)
router.post("/:id/generate-specification-request", requestTenderSpecificationHandler);
router.patch("/:id/specification/publish", publishTenderSpecificationHandler);

export default router;