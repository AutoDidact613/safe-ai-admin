import { Request, Response } from "express";
import {
  createTender,
  listTenders,
  getTenderById,
  updateTender,
  deleteTender,
  closeTender,
  applyToTender,
  getProductTypeList,
  getAIApplicationTypeList,
  // createSmartTender,  // נעקוף את פונקציית המעבר הבעייתית
  smartSearchTenders,     
} from "../services/tenderBoardService";
import { AIService } from "../services/tenderBoardAIService"; // יבוא ישיר של שירות ה-AI הסטטי החסון
import logger from "../logger";

/**
 * GET all static product types
 */
export async function listProductTypes(req: Request, res: Response) {
  try {
    const fields = await getProductTypeList();
    res.json(fields);
  } catch (error) {
    logger.error("List product types failed", { error });
    res.status(500).json({ error: "Failed to fetch product types" });
  }
}

//Get all AI application types
export async function listAIApplicationTypes(req: Request, res: Response) {
  try {
    const fields = await getAIApplicationTypeList();
    res.json(fields);
  } catch (error) {
    logger.error("List AI application types failed", { error });
    res.status(500).json({ error: "Failed to fetch AI application types" });
  }
}

/**
 * CREATE Tender
 */
export async function createTenderHandler(req: Request, res: Response) {
  try {
    const tender = await createTender(req.body);
    res.status(201).json({ success: true, tender });
  } catch (error) {
    logger.error("Create tender failed", { error });
    res.status(500).json({ error: "Failed to create tender" });
  }
}

/**
 * GET all Tenders
 */
export async function listTendersHandler(req: Request, res: Response) {
  try {
    const tenders = await listTenders();
    res.json(tenders);
  } catch (error) {
    logger.error("List tenders failed", { error });
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
}

/**
 * GET Tender by ID
 */
export async function getTenderHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const tender = await getTenderById(req.params.id);

    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json(tender);
  } catch (error) {
    logger.error("Get tender failed", { error });
    res.status(500).json({ error: "Failed to fetch tender" });
  }
}

/**
 * UPDATE Tender
 */
export async function updateTenderHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const tender = await updateTender(req.params.id, req.body);

    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json({ success: true, tender });
  } catch (error) {
    logger.error("Update tender failed", { error });
    res.status(500).json({ error: "Failed to update tender" });
  }
}

/**
 * DELETE Tender
 */
export async function deleteTenderHandler(req: Request<{ id: string }>, res: Response) {
  try {
    await deleteTender(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error("Delete tender failed", { error });
    res.status(500).json({ error: "Failed to delete tender" });
  }
}

/**
 * Apply to a tender
 * POST /tender-board/:id/apply
 * Body: { name, email, details, proposal?, contactMethod? }
 */
export async function applyToTenderHandler(req: Request, res: Response) {
  try {
    const tenderId = req.params.id as string;

    if (!tenderId || !tenderId.trim()) {
      return res.status(400).json({
        error: "Tender ID is required",
      });
    }

    const applicant = {
      name: req.body.name,
      email: req.body.email,
      details: req.body.details,
      proposal: req.body.proposal,
      contactMethod: req.body.contactMethod,
    };

    const result = await applyToTender(tenderId, applicant);

    res.status(200).json({
      success: true,
      tender: result,
    });
  } catch (error: any) {
    logger.error("Apply to tender failed", { 
      error: error.message, 
      tenderId: req.params.id 
    });
    res.status(400).json({
      error: error.message || "Failed to apply to tender",
    });
  }
}

/**
 * CLOSE Tender
 * PATCH /tender-board/:id/close
 */
export async function closeTenderHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const tender = await closeTender(req.params.id);

    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json({ success: true, tender });
  } catch (error) {
    logger.error("Close tender failed", { error });
    res.status(500).json({ error: "Failed to close tender" });
  }
}

/**
 * ========================================================
 * נקודות קצה חדשות - התממשקות ל-AI
 * ========================================================
 */

/**
 * CREATE Tender via AI (Smart Creation)
 * POST /tender-board/smart-create
 * Body: { text: "מחפש מישהו שיבנה לי אתר למכירת מוצרים..." }
 */
export async function createSmartTenderHandler(req: Request, res: Response) {
  try {
    debugger
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text description is required for AI generation" });
    }

    // קריאה ישירה לפונקציה הסטטית המאובטחת שתיקנו ב-AIService
    const parsedAiData = await AIService.generateTenderData(text);
    
    // החזרת האובייקט המפורסר מה-AI ללא יצירת המכרז בבסיס הנתונים
    res.status(200).json({ success: true, product: parsedAiData });
  } catch (error: any) {
    logger.error("Smart create tender failed", { error: error.message });
    res.status(500).json({ error: error.message || "Failed to generate tender using AI" });
  }
}

/**
 * SMART SEARCH Tenders via AI
 * GET /tender-board/smart-search?q=מכרזים של אפליקציות בצפון
 */
export async function smartSearchTendersHandler(req: Request, res: Response) {
  try {
    const searchText = req.query.q as string;

    if (!searchText || !searchText.trim()) {
      return res.status(400).json({ error: "Search query param 'q' is required" });
    }

    // קריאה לפונקציית השירות שתמיר את הטקסט לשאילתת מונגו ותשלוף מה-DB
    const tenders = await smartSearchTenders(searchText);

    res.json(tenders);
  } catch (error: any) {
    logger.error("Smart search tenders failed", { error: error.message });

    // שימוש ב-statusCode שהוצמד לשגיאה ב-Service (למשל 429), אחרת 500
    const statusCode = error?.statusCode ?? 500;
    res.status(statusCode).json({ error: error.message || "Failed to perform smart search" });
  }
}