import { Request, Response } from "express";
import {
  createTender,
  listTenders,
  getTenderById,
  updateTender,
  deleteTender,
  closeTender,
  markTenderOffersViewed,
  applyToTender,
  getProductTypeList,
  getAIApplicationTypeList,
  // createSmartTender,  // נעקוף את פונקציית המעבר הבעייתית
  smartSearchTenders,
  getTenderAgentContext,
  requestTenderSpecification,
  saveTenderSpecification,
  setTenderSpecificationPublished,
} from "../services/tenderBoardService";
import { TBAIService } from "../services/tenderBoardAIService";
import { generatePresignedDownloadUrl } from "../services/s3Service";
import { getProfileById } from "../services/professionalProfileService";
import { triggerTenderSpecAgent, cancelTenderSpecAgent } from "../services/tenderSpecAgentRunner";
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

function isOwnerOrAdmin(req: Request, tender: any): boolean {
  const user = (req as any).user;
  return user?.role === "admin" || tender?.publisherUserCode === user?.userId;
}

/**
 * מחליף את resumeFileKey בקישור הורדה חתום ומצרף תקציר פרופיל מקצועי (אם צורף),
 * עבור בעל המכרז/אדמין בלבד; למשתמשים אחרים השדות מוסרים מהתגובה כדי לא לחשוף
 * קובץ/פרופיל פרטי של מועמד.
 */
async function withSignedApplicantDetails(req: Request, tender: any): Promise<any> {
  if (!tender?.applicants?.length) return tender;

  const authorized = isOwnerOrAdmin(req, tender);
  const plain = typeof tender.toObject === "function" ? tender.toObject() : tender;

  plain.applicants = await Promise.all(
    plain.applicants.map(async (applicant: any) => {
      if (!authorized) {
        const { resumeFileKey, professionalProfileId, ...rest } = applicant;
        return rest;
      }

      const signedApplicant = applicant.resumeFileKey
        ? { ...applicant, resumeFileKey: await generatePresignedDownloadUrl(applicant.resumeFileKey) }
        : applicant;

      if (!applicant.professionalProfileId) return signedApplicant;

      const profile = await getProfileById(applicant.professionalProfileId.toString());
      if (!profile) return signedApplicant;

      return {
        ...signedApplicant,
        professionalProfile: {
          name: profile.name,
          description: profile.description,
          experience: profile.experience,
        },
      };
    })
  );

  return plain;
}

/**
 * CREATE Tender
 */
export async function createTenderHandler(req: Request, res: Response) {
  try {
    await TBAIService.assertTenderIsProgrammingRelated(req.body);
  } catch (error: any) {
    logger.warn("Tender rejected by domain guardrail", { error: error.message });
    return res.status(error.statusCode ?? 400).json({ error: error.message });
  }

  try {
    const user = (req as any).user;
    // publisherUserCode is derived from the authenticated user, never trusted from the client body,
    // otherwise any caller could create a tender that impersonates another publisher.
    const tender = await createTender({ ...req.body, publisherUserCode: user?.userId });
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
    const withSignedResumes = await Promise.all(
      tenders.map((tender: any) => withSignedApplicantDetails(req, tender))
    );
    res.json(withSignedResumes);
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

    res.json(await withSignedApplicantDetails(req, tender));
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
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await updateTender(req.params.id, req.body);

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
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

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
      resumeFileKey: req.body.resumeFileKey,
      portfolioLink: req.body.portfolioLink,
      professionalProfileId: req.body.professionalProfileId,
    };

    if (applicant.professionalProfileId) {
      const user = (req as any).user;
      const profile = await getProfileById(applicant.professionalProfileId);
      if (!profile || profile.userId?.toString() !== user?.userId) {
        return res.status(403).json({ error: "Invalid professional profile" });
      }
    }

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
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await closeTender(req.params.id);

    res.json({ success: true, tender });
  } catch (error) {
    logger.error("Close tender failed", { error });
    res.status(500).json({ error: "Failed to close tender" });
  }
}

/**
 * מסמן את כל ההצעות (applicants) של מכרז כנצפו
 * PATCH /tender-board/:id/view-offers
 */
export async function viewTenderOffersHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await markTenderOffersViewed(req.params.id);

    res.json({ success: true, tender });
  } catch (error) {
    logger.error("Mark tender offers as viewed failed", { error });
    res.status(500).json({ error: "Failed to mark tender offers as viewed" });
  }
}

/**
 * ========================================================
 * אפיון אוטומטי + המלצת פיתוח (SCRUM-287/291/293)
 * ========================================================
 */

/**
 * GET /tender-board/:id/agent-context
 * Agent-facing (service-token / admin JWT via requireAdmin, see router).
 */
export async function getTenderAgentContextHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const context = await getTenderAgentContext(req.params.id);

    if (!context) {
      return res.status(404).json({ error: "Tender not found" });
    }

    res.json(context);
  } catch (error) {
    logger.error("Get tender agent context failed", { error });
    res.status(500).json({ error: "Failed to fetch tender agent context" });
  }
}

/**
 * POST /tender-board/:id/specification
 * Agent-facing write-back (service-token / admin JWT via requireAdmin, see router).
 * Body: { status, techStackRecommendation?, openSourceReferences?, readingSources?, document?, errorMessage? }
 */
export async function saveTenderSpecificationHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const tender = await saveTenderSpecification(req.params.id, req.body);
    res.json({ success: true, tender });
  } catch (error: any) {
    logger.error("Save tender specification failed", { error: error.message, tenderId: req.params.id });
    res.status(400).json({ error: error.message || "Failed to save tender specification" });
  }
}

/**
 * POST /tender-board/:id/generate-specification-request
 * בעל המכרז/אדמין בלבד - מסמן status=pending ומפעיל את ה-agent (SCRUM-293).
 */
export async function requestTenderSpecificationHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await requestTenderSpecification(req.params.id);
    triggerTenderSpecAgent(req.params.id);

    res.status(202).json({ success: true, tender });
  } catch (error: any) {
    logger.error("Request tender specification failed", { error: error.message, tenderId: req.params.id });
    res.status(500).json({ error: error.message || "Failed to request tender specification" });
  }
}

/**
 * POST /tender-board/:id/cancel-specification-request
 * בעל המכרז/אדמין בלבד - מבטלת ריצת agent פעילה ומסמנת status=failed עם הודעה
 * שהמשתמש ביטל (SCRUM-293 follow-up).
 */
export async function cancelTenderSpecificationHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const cancelled = cancelTenderSpecAgent(req.params.id);

    if (!cancelled) {
      return res.status(409).json({ error: "No specification generation is currently running for this tender" });
    }

    res.json({ success: true });
  } catch (error: any) {
    logger.error("Cancel tender specification failed", { error: error.message, tenderId: req.params.id });
    res.status(500).json({ error: error.message || "Failed to cancel specification generation" });
  }
}

/**
 * PATCH /tender-board/:id/specification/publish
 * בעל המכרז/אדמין בלבד - הבחירה אם לפרסם את האפיון יחד עם המכרז או להשאיר פרטי.
 * Body: { isPublished: boolean }
 */
export async function publishTenderSpecificationHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const existing = await getTenderById(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: "Tender not found" });
    }

    if (!isOwnerOrAdmin(req, existing)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tender = await setTenderSpecificationPublished(req.params.id, Boolean(req.body?.isPublished));
    res.json({ success: true, tender });
  } catch (error: any) {
    logger.error("Publish tender specification failed", { error: error.message, tenderId: req.params.id });
    res.status(400).json({ error: error.message || "Failed to update specification publish state" });
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
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text description is required for AI generation" });
    }

    const parsedAiData = await TBAIService.generateTenderData(text);
    
    // החזרת האובייקט המפורסר מה-AI ללא יצירת המכרז בבסיס הנתונים
    res.status(201).json({ success: true, tender: parsedAiData });
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