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
import type { LogActor } from "../services/tenderBoardService";
import { TBAIService } from "../services/tenderBoardAIService";
import { getUserById } from "../repositories/userRepository";
import logger from "../logger";

/**
 * Resolves the audit-log identity for the current request. userId comes straight off the
 * decoded JWT (req.user), but organizationId isn't part of the token payload, so it requires
 * a DB lookup. Never throws — logging enrichment must never be able to break a request.
 */
async function getActor(req: Request): Promise<LogActor> {
  const user = (req as any).user;
  if (!user?.userId) return {};

  try {
    const dbUser = await getUserById(user.userId);
    return { userId: user.userId, organizationId: dbUser?.organizationId?.toString() };
  } catch {
    return { userId: user.userId };
  }
}

/**
 * GET all static product types
 */
export async function listProductTypes(req: Request, res: Response) {
  try {
    const fields = await getProductTypeList();
    res.json(fields);
  } catch (err) {
    const error = err as Error;
    const actor = await getActor(req);
    logger.error("List product types failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to fetch product types" });
  }
}

//Get all AI application types
export async function listAIApplicationTypes(req: Request, res: Response) {
  try {
    const fields = await getAIApplicationTypeList();
    res.json(fields);
  } catch (err) {
    const error = err as Error;
    const actor = await getActor(req);
    logger.error("List AI application types failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to fetch AI application types" });
  }
}

function isOwnerOrAdmin(req: Request, tender: any): boolean {
  const user = (req as any).user;
  return user?.role === "admin" || tender?.publisherUserCode === user?.userId;
}

/**
 * CREATE Tender
 */
export async function createTenderHandler(req: Request, res: Response) {
  const actor = await getActor(req);
  try {
    const user = (req as any).user;
    // publisherUserCode is derived from the authenticated user, never trusted from the client body,
    // otherwise any caller could create a tender that impersonates another publisher.
    const tender = await createTender({ ...req.body, publisherUserCode: user?.userId }, actor);
    res.status(201).json({ success: true, tender });
  } catch (err) {
    const error = err as Error;
    logger.error("Create tender failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to create tender" });
  }
}

/**
 * GET all Tenders
 */
export async function listTendersHandler(req: Request, res: Response) {
  const actor = await getActor(req);
  try {
    const tenders = await listTenders(actor);
    res.json(tenders);
  } catch (err) {
    const error = err as Error;
    logger.error("List tenders failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
}

/**
 * GET Tender by ID
 */
export async function getTenderHandler(req: Request<{ id: string }>, res: Response) {
  const actor = await getActor(req);
  try {
    const tender = await getTenderById(req.params.id, actor);

    if (!tender) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json(tender);
  } catch (err) {
    const error = err as Error;
    logger.error("Get tender failed", {
      error: error.message,
      stack: error.stack,
      tenderId: req.params.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to fetch tender" });
  }
}

/**
 * UPDATE Tender
 */
export async function updateTenderHandler(req: Request<{ id: string }>, res: Response) {
  const actor = await getActor(req);
  try {
    const existing = await getTenderById(req.params.id, actor);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await updateTender(req.params.id, req.body, actor);

    res.json({ success: true, tender });
  } catch (err) {
    const error = err as Error;
    logger.error("Update tender failed", {
      error: error.message,
      stack: error.stack,
      tenderId: req.params.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to update tender" });
  }
}

/**
 * DELETE Tender
 */
export async function deleteTenderHandler(req: Request<{ id: string }>, res: Response) {
  const actor = await getActor(req);
  try {
    const existing = await getTenderById(req.params.id, actor);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    await deleteTender(req.params.id, actor);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    logger.error("Delete tender failed", {
      error: error.message,
      stack: error.stack,
      tenderId: req.params.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: "Failed to delete tender" });
  }
}

/**
 * Apply to a tender
 * POST /tender-board/:id/apply
 * Body: { name, email, details, proposal?, contactMethod? }
 */
export async function applyToTenderHandler(req: Request, res: Response) {
  const actor = await getActor(req);
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

    const result = await applyToTender(tenderId, applicant, actor);

    res.status(200).json({
      success: true,
      tender: result,
    });
  } catch (error: any) {
    logger.error("Apply to tender failed", {
      error: error.message,
      stack: error.stack,
      tenderId: req.params.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });

    if (error.code === "ALREADY_APPLIED") {
      return res.status(409).json({
        error: error.message,
        code: error.code,
      });
    }

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
  const actor = await getActor(req);
  try {
    const existing = await getTenderById(req.params.id, actor);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await closeTender(req.params.id, actor);

    res.json({ success: true, tender });
  } catch (err) {
    const error = err as Error;
    logger.error("Close tender failed", {
      error: error.message,
      stack: error.stack,
      tenderId: req.params.id,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
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
  const actor = await getActor(req);
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text description is required for AI generation" });
    }

    const parsedAiData = await TBAIService.generateTenderData(text, actor);

    // החזרת האובייקט המפורסר מה-AI ללא יצירת המכרז בבסיס הנתונים
    res.status(201).json({ success: true, tender: parsedAiData });
  } catch (error: any) {
    logger.error("Smart create tender failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });
    res.status(500).json({ error: error.message || "Failed to generate tender using AI" });
  }
}

/**
 * SMART SEARCH Tenders via AI
 * GET /tender-board/smart-search?q=מכרזים של אפליקציות בצפון
 */
export async function smartSearchTendersHandler(req: Request, res: Response) {
  const actor = await getActor(req);
  try {
    const searchText = req.query.q as string;

    if (!searchText || !searchText.trim()) {
      return res.status(400).json({ error: "Search query param 'q' is required" });
    }

    // קריאה לפונקציית השירות שתמיר את הטקסט לוקטור ותבצע $vectorSearch מול Atlas
    const tenders = await smartSearchTenders(searchText, undefined, actor);

    res.json(tenders);
  } catch (error: any) {
    logger.error("Smart search tenders failed", {
      error: error.message,
      stack: error.stack,
      userId: actor.userId,
      organizationId: actor.organizationId,
    });

    // שימוש ב-statusCode שהוצמד לשגיאה ב-Service (למשל 429), אחרת 500
    const statusCode = error?.statusCode ?? 500;
    res.status(statusCode).json({ error: error.message || "Failed to perform smart search" });
  }
}