import request from "supertest";
import express from "express";
import router from "../../routes/tenderBoardRouter"; // נתיב הראוטר שלך
import * as service from "../tenderBoardService";
import { AIService } from "../tenderBoardAIService";
import { triggerTenderSpecAgent, cancelTenderSpecAgent } from "../tenderSpecAgentRunner";

// 1. הגדרת מוקים (Mocks) לכל השירותים והשכבות החיצוניות כדי למנוע קריאות אמיתיות ל-DB או ל-AI
jest.mock("../tenderBoardService");
jest.mock("../tenderBoardAIService");
jest.mock("../../repositories/tenderBoardRepository");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));
jest.mock("../../utils/email", () => ({
  sendApplicantRegisteredEmail: jest.fn(),
  sendTenderClosedEmail: jest.fn(),
}));
jest.mock("../../models/tendersBoardLog", () => ({
  TenderLog: {
    create: jest.fn(),
  },
}));
jest.mock("mongoose", () => ({
  ...jest.requireActual("mongoose"),
  Types: {
    ObjectId: {
      isValid: jest.fn().mockReturnValue(true),
    },
  },
}));
jest.mock("../aiService", () => ({
  callAI: jest.fn(),
}));
jest.mock("../tenderSpecAgentRunner", () => ({
  triggerTenderSpecAgent: jest.fn(),
  cancelTenderSpecAgent: jest.fn(),
}));
// 2. עקיפת ה-Middleware של האוונטיקציה לצורך בדיקות יחידה מבודדות.
// כדי לבדוק את בדיקות ההרשאה/בעלות (isOwnerOrAdmin) על update/close/delete,
// מאפשרים לכל בקשה להעביר את זהות המשתמש המדומה בכותרת x-test-user (JSON),
// בלי לשבור טסטים קיימים שלא מגדירים את הכותרת הזו כלל (req.user יישאר undefined).
jest.mock("../../middleware/auth", () => {
  const authenticateToken = (req: any, res: any, next: any) => {
    const testUser = req.headers["x-test-user"];
    if (testUser) req.user = JSON.parse(testUser);
    next();
  };
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };
  // מוקאפ תואם למימוש האמיתי (apps/server/src/middleware/auth.ts) - נדרש כי
  // הראוטר האמיתי מטיל אותו על agent-context/specification (SCRUM-287/293).
  // בדיקת ה-AGENT_SERVICE_TOKEN הסטטי לא נבדקת דרך ה-harness הזה (עוקף JWT/secret
  // check לגמרי) - היא מכוסה בבדיקות אינטגרציה נפרדות מול המימוש האמיתי.
  const requireAdminOrServiceToken = (req: any, res: any, next: any) => {
    authenticateToken(req, res, () => requireAdmin(req, res, next));
  };
  return { authenticateToken, requireAdmin, requireAdminOrServiceToken };
});

// אתחול אפליקציית Express פיקטיבית לצורך הבדיקה
const app = express();
app.use(express.json());
app.use("/tender-board", router);

describe("Tender Board Feature Tests", () => {
  
  // איפוס המוקים לפני כל בדיקה כדי שלא ישפיעו אחת על השנייה
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // א. בדיקות עבור פונקציות הסטטיות (Static Lists)
  // ==========================================
  describe("GET /tender-board/product-types", () => {
    it("should return a list of product types with 200 OK", async () => {
      const mockTypes = ["אפליקציה", "אתר"];
      (service.getProductTypeList as jest.Mock).mockResolvedValue(mockTypes);

      const res = await request(app).get("/tender-board/product-types");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTypes);
      expect(service.getProductTypeList).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // ב. בדיקות CRUD - יצירה, שליפה, עדכון ומחיקה
  // ==========================================
  describe("POST /tender-board", () => {
    it("should create a new tender successfully", async () => {
      const mockTenderInput = { title: "אתר חדש", budget: "10,000" };
      const mockCreatedTender = { _id: "123", ...mockTenderInput };
      
      (service.createTender as jest.Mock).mockResolvedValue(mockCreatedTender);

      const res = await request(app)
        .post("/tender-board")
        .send(mockTenderInput);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, tender: mockCreatedTender });
    });
  });

  describe("GET /tender-board/:id", () => {
    it("should return a tender if it exists", async () => {
      const mockTender = { _id: "123", title: "מערכת AI" };
      (service.getTenderById as jest.Mock).mockResolvedValue(mockTender);

      const res = await request(app).get("/tender-board/123");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTender);
    });

    it("should return 404 if tender is not found", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(null);

      const res = await request(app).get("/tender-board/999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Tender not found");
    });
  });

  // ==========================================
  // ג. בדיקות לוגיקת הגשת מועמדות (Apply Logic)
  // ==========================================
  describe("POST /tender-board/:id/apply", () => {
    it("should return 400 if validation fields are missing", async () => {
      (service.applyToTender as jest.Mock).mockRejectedValue(
        new Error("Applicant email is required")
      );

      const res = await request(app)
        .post("/tender-board/123/apply")
        .send({ name: "ישראל" });

      expect(res.status).toBe(400);
    });

    it("should block duplicate applications from the same person", async () => {
      (service.applyToTender as jest.Mock).mockRejectedValue(
        new Error("Applicant already exists")
      );

      await expect(
        service.applyToTender("123", { name: "משה", email: "moshe@test.com", details: "מעוניין" })
      ).rejects.toThrow("Applicant already exists");
    });
  });

  // ==========================================
  // ד. בדיקות פיצ'ר ה-AI החכם (Smart Create & Search)
  // ==========================================
  describe("POST /tender-board/smart-create", () => {
    it("should generate tender using AI and save it", async () => {
      const userInput = { text: "בנה לי אפליקציה" };
      const mockAiParsedData = { title: "אפליקציה מותאמת", productType: "אפליקציה" };

      // הקונטרולר מחזיר את תוצאת generateTenderData ישירות — ללא _id
      AIService.generateTenderData = jest.fn().mockResolvedValue(mockAiParsedData);

      const res = await request(app)
        .post("/tender-board/smart-create")
        .send(userInput);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.tender).toEqual(mockAiParsedData);
      expect(AIService.generateTenderData).toHaveBeenCalledWith("בנה לי אפליקציה");
    });

    it("should return 400 if text parameter is empty", async () => {
      const res = await request(app)
        .post("/tender-board/smart-create")
        .send({ text: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Text description is required");
    });
  });

  // ==========================================
  // ה. בדיקות הרשאה/בעלות על עדכון/סגירה/מחיקת מכרז
  // ==========================================
  const OWNER_USER = JSON.stringify({ userId: "owner-1", role: "user" });
  const OTHER_USER = JSON.stringify({ userId: "someone-else", role: "user" });
  const ADMIN_USER = JSON.stringify({ userId: "admin-1", role: "admin" });
  const existingTender = { _id: "123", title: "מכרז קיים", publisherUserCode: "owner-1" };

  describe("PUT /tender-board/:id (ownership)", () => {
    it("allows the publisher to update their own tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.updateTender as jest.Mock).mockResolvedValue({ ...existingTender, title: "עודכן" });

      const res = await request(app)
        .put("/tender-board/123")
        .set("x-test-user", OWNER_USER)
        .send({ title: "עודכן" });

      expect(res.status).toBe(200);
      expect(service.updateTender).toHaveBeenCalledWith("123", { title: "עודכן" });
    });

    it("allows an admin to update someone else's tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.updateTender as jest.Mock).mockResolvedValue({ ...existingTender, title: "עודכן" });

      const res = await request(app)
        .put("/tender-board/123")
        .set("x-test-user", ADMIN_USER)
        .send({ title: "עודכן" });

      expect(res.status).toBe(200);
    });

    it("denies a non-owner, non-admin user with 403", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .put("/tender-board/123")
        .set("x-test-user", OTHER_USER)
        .send({ title: "ניסיון השתלטות" });

      expect(res.status).toBe(403);
      expect(service.updateTender).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /tender-board/:id/close (ownership)", () => {
    it("denies a non-owner, non-admin user with 403", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .patch("/tender-board/123/close")
        .set("x-test-user", OTHER_USER);

      expect(res.status).toBe(403);
      expect(service.closeTender).not.toHaveBeenCalled();
    });

    it("allows the publisher to close their own tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.closeTender as jest.Mock).mockResolvedValue({ ...existingTender, isActive: false });

      const res = await request(app)
        .patch("/tender-board/123/close")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(200);
      expect(service.closeTender).toHaveBeenCalledWith("123");
    });
  });

  describe("DELETE /tender-board/:id (ownership)", () => {
    it("denies a non-owner, non-admin user with 403", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .delete("/tender-board/123")
        .set("x-test-user", OTHER_USER);

      expect(res.status).toBe(403);
      expect(service.deleteTender).not.toHaveBeenCalled();
    });

    it("allows the publisher to delete their own tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.deleteTender as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .delete("/tender-board/123")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /tender-board/smart-search", () => {
    it("should perform smart search using AI mongo query translation", async () => {
      const mockMongoQuery = { productType: "אפליקציה" };
      const mockTendersResult = [{ _id: "1", title: "מכרז אפליקציה בצפון" }];

      AIService.generateSearchQuery = jest.fn().mockResolvedValue(mockMongoQuery);
      (service.smartSearchTenders as jest.Mock).mockResolvedValue(mockTendersResult);

      const res = await request(app)
        .get("/tender-board/smart-search")
        .query({ q: "מכרזים של אפליקציות" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockTendersResult);
    });
  });

  // ==========================================
  // ו. אפיון אוטומטי + המלצת פיתוח (SCRUM-287/291/292/293)
  // ==========================================
  describe("GET /tender-board/:id/agent-context (agent-facing, admin only)", () => {
    it("returns the tender context for an admin (service-token) caller", async () => {
      const mockContext = { id: "123", title: "מכרז קיים" };
      (service.getTenderAgentContext as jest.Mock).mockResolvedValue(mockContext);

      const res = await request(app)
        .get("/tender-board/123/agent-context")
        .set("x-test-user", ADMIN_USER);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockContext);
    });

    it("denies a regular (non-admin) user with 403", async () => {
      const res = await request(app)
        .get("/tender-board/123/agent-context")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(403);
      expect(service.getTenderAgentContext).not.toHaveBeenCalled();
    });

    it("returns 404 when the tender does not exist", async () => {
      (service.getTenderAgentContext as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get("/tender-board/999/agent-context")
        .set("x-test-user", ADMIN_USER);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /tender-board/:id/specification (agent-facing write-back, admin only)", () => {
    it("saves a ready specification from an admin (service-token) caller", async () => {
      const specPayload = {
        status: "ready",
        techStackRecommendation: "Node.js + React",
        openSourceReferences: [{ title: "foo", url: "https://example.com/foo" }],
        readingSources: [],
        document: "# foo",
      };
      (service.saveTenderSpecification as jest.Mock).mockResolvedValue({
        _id: "123",
        specification: specPayload,
      });

      const res = await request(app)
        .post("/tender-board/123/specification")
        .set("x-test-user", ADMIN_USER)
        .send(specPayload);

      expect(res.status).toBe(200);
      expect(service.saveTenderSpecification).toHaveBeenCalledWith("123", specPayload);
    });

    it("denies a regular (non-admin) user with 403", async () => {
      const res = await request(app)
        .post("/tender-board/123/specification")
        .set("x-test-user", OWNER_USER)
        .send({ status: "ready" });

      expect(res.status).toBe(403);
      expect(service.saveTenderSpecification).not.toHaveBeenCalled();
    });

    it("returns 400 when the service rejects an invalid status", async () => {
      (service.saveTenderSpecification as jest.Mock).mockRejectedValue(
        new Error("Invalid specification status")
      );

      const res = await request(app)
        .post("/tender-board/123/specification")
        .set("x-test-user", ADMIN_USER)
        .send({ status: "not-a-real-status" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /tender-board/:id/generate-specification-request (ownership)", () => {
    it("allows the publisher to request specification generation and triggers the agent", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.requestTenderSpecification as jest.Mock).mockResolvedValue({
        ...existingTender,
        specification: { status: "pending" },
      });

      const res = await request(app)
        .post("/tender-board/123/generate-specification-request")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(202);
      expect(service.requestTenderSpecification).toHaveBeenCalledWith("123");
      expect(triggerTenderSpecAgent).toHaveBeenCalledWith("123");
    });

    it("allows an admin to request specification generation for someone else's tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.requestTenderSpecification as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .post("/tender-board/123/generate-specification-request")
        .set("x-test-user", ADMIN_USER);

      expect(res.status).toBe(202);
    });

    it("denies a non-owner, non-admin user with 403 and does not trigger the agent", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .post("/tender-board/123/generate-specification-request")
        .set("x-test-user", OTHER_USER);

      expect(res.status).toBe(403);
      expect(service.requestTenderSpecification).not.toHaveBeenCalled();
      expect(triggerTenderSpecAgent).not.toHaveBeenCalled();
    });

    it("returns 404 when the tender does not exist", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/tender-board/999/generate-specification-request")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(404);
      expect(triggerTenderSpecAgent).not.toHaveBeenCalled();
    });
  });

  describe("POST /tender-board/:id/cancel-specification-request (ownership)", () => {
    it("allows the publisher to cancel a running generation", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (cancelTenderSpecAgent as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post("/tender-board/123/cancel-specification-request")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(200);
      expect(cancelTenderSpecAgent).toHaveBeenCalledWith("123");
    });

    it("allows an admin to cancel someone else's running generation", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (cancelTenderSpecAgent as jest.Mock).mockReturnValue(true);

      const res = await request(app)
        .post("/tender-board/123/cancel-specification-request")
        .set("x-test-user", ADMIN_USER);

      expect(res.status).toBe(200);
    });

    it("returns 409 when nothing is currently running for this tender", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (cancelTenderSpecAgent as jest.Mock).mockReturnValue(false);

      const res = await request(app)
        .post("/tender-board/123/cancel-specification-request")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(409);
    });

    it("denies a non-owner, non-admin user with 403 and does not cancel anything", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .post("/tender-board/123/cancel-specification-request")
        .set("x-test-user", OTHER_USER);

      expect(res.status).toBe(403);
      expect(cancelTenderSpecAgent).not.toHaveBeenCalled();
    });

    it("returns 404 when the tender does not exist", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/tender-board/999/cancel-specification-request")
        .set("x-test-user", OWNER_USER);

      expect(res.status).toBe(404);
      expect(cancelTenderSpecAgent).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /tender-board/:id/specification/publish (ownership)", () => {
    it("allows the publisher to publish their tender's specification", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);
      (service.setTenderSpecificationPublished as jest.Mock).mockResolvedValue({
        ...existingTender,
        specification: { status: "ready", isPublished: true },
      });

      const res = await request(app)
        .patch("/tender-board/123/specification/publish")
        .set("x-test-user", OWNER_USER)
        .send({ isPublished: true });

      expect(res.status).toBe(200);
      expect(service.setTenderSpecificationPublished).toHaveBeenCalledWith("123", true);
    });

    it("denies a non-owner, non-admin user with 403", async () => {
      (service.getTenderById as jest.Mock).mockResolvedValue(existingTender);

      const res = await request(app)
        .patch("/tender-board/123/specification/publish")
        .set("x-test-user", OTHER_USER)
        .send({ isPublished: true });

      expect(res.status).toBe(403);
      expect(service.setTenderSpecificationPublished).not.toHaveBeenCalled();
    });
  });
});