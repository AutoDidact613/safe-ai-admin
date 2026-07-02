import request from "supertest";
import express from "express";
import router from "../../routes/tenderBoardRouter"; // נתיב הראוטר שלך
import * as service from "../tenderBoardService";
import { AIService } from "../tenderBoardAIService";
import * as repo from "../../repositories/tenderBoardRepository";

// 1. הגדרת מוקים (Mocks) לכל השירותים והשכבות החיצוניות כדי למנוע קריאות אמיתיות ל-DB או ל-AI
jest.mock("../tenderBoardService");
jest.mock("../tenderBoardAIService");
jest.mock("../../repositories/tenderBoardRepository");
jest.mock("../../logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

// 2. עקיפת ה-Middleware של האוונטיקציה לצורך בדיקות יחידה מבודדות
jest.mock("../middleware/auth", () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

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
      const incompleteApplicant = { name: "ישראל" }; // חסר מייל ופרטים

      const res = await request(app)
        .post("/tender-board/123/apply")
        .send(incompleteApplicant);

      expect(res.status).toBe(400);
    });

    it("should block duplicate applications from the same person", async () => {
      // דימוי של מכרז קיים שבו המשתמש כבר מופיע ברשימת הפונים
      const mockExistingTender = {
        _id: "123",
        applicants: [{ name: "משה", email: "moshe@test.com" }]
      };
      (repo.getTenderById as jest.Mock).mockResolvedValue(mockExistingTender);

      // קריאה ישירה לפונקציית השרות כדי לבדוק את ה-Error שנזרק בלוגיקה
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
      const mockSavedTender = { _id: "abc", ...mockAiParsedData };

      // הגדרת החזרת ערכים מה-Mock הסטטי של ה-AI ומפונקציית היצירה
      AIService.generateTenderData = jest.fn().mockResolvedValue(mockAiParsedData);
      (service.createTender as jest.Mock).mockResolvedValue(mockSavedTender);

      const res = await request(app)
        .post("/tender-board/smart-create")
        .send(userInput);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.tender).toEqual(mockSavedTender);
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
});