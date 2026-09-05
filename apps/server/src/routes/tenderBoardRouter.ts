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
  cancelTenderSpecificationHandler,
  publishTenderSpecificationHandler,
} from "../controllers/tenderBoardController";
import { authenticateToken, requireAdminOrServiceToken } from "../middleware/auth";

const router = express.Router();

// אפיון אוטומטי + המלצת פיתוח (SCRUM-287/291/293)
// שני אלה agent-facing בלבד - טוקן שירות קבוע (AGENT_SERVICE_TOKEN) או JWT אדמין
// לדיבוג ידני (ראו requireAdminOrServiceToken ב-middleware/auth.ts). חייבים להירשם
// לפני router.use(authenticateToken) למטה - אחרת ה-authenticateToken הגורף דוחה טוקן
// שירות (שאינו JWT חתום) לפני שהוא בכלל מגיע ל-middleware הזה (כמו ב-organizationRouter.ts).
router.get("/:id/agent-context", requireAdminOrServiceToken, getTenderAgentContextHandler);
router.post("/:id/specification", requireAdminOrServiceToken, saveTenderSpecificationHandler);

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

// אלה מופעלים מה-UI ע"י בעל המכרז/אדמין (נבדק בתוך ה-handler עצמו)
router.post("/:id/generate-specification-request", requestTenderSpecificationHandler);
router.post("/:id/cancel-specification-request", cancelTenderSpecificationHandler);
router.patch("/:id/specification/publish", publishTenderSpecificationHandler);

export default router;