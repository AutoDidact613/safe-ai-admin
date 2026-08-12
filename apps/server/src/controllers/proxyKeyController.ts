import { Request, Response } from "express";
import { getProxyKeyInfo, regenerateProxyKey, toggleProxyKeyStatus } from "../services/proxyKeyService";
import logger from "../logger";

/**
 * Get current user's proxy key information
 */
export async function getProxyKeyHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const keyInfo = await getProxyKeyInfo(userId);
    
    if (!keyInfo) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(keyInfo);
  } catch (error) {
    logger.error("Error fetching proxy key info:", { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    res.status(500).json({ error: "Failed to fetch proxy key information" });
  }
}

/**
 * Regenerate proxy key for current user
 */
export async function regenerateProxyKeyHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await regenerateProxyKey(userId);
    
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "Proxy key regenerated successfully",
      proxyApiKey: result.proxyApiKey,
      keyInfo: result.keyInfo,
    });
  } catch (error: any) {
    logger.error("Error regenerating proxy key:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to regenerate proxy key",
      details: error.message 
    });
  }
}

/**
 * Toggle proxy key active status (enable/disable)
 */
export async function toggleProxyKeyHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    const { isActive } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be a boolean" });
    }

    const keyInfo = await toggleProxyKeyStatus(userId, isActive);
    
    if (!keyInfo) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: `Proxy key ${isActive ? "enabled" : "disabled"} successfully`,
      keyInfo,
    });
  } catch (error: any) {
    logger.error("Error toggling proxy key status:", { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Failed to toggle proxy key status",
      details: error.message 
    });
  }
}
