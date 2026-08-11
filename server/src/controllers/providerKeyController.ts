import { Request, Response } from "express";
import {
  addProviderKey,
  listProviderKeys,
  getProviderKeyById,
  updateProviderKey,
  deleteProviderKey,
  ForbiddenError,
  Requester,
} from "../services/providerKeyService";

function getRequester(req: Request): Requester {
  const user = (req as any).user;
  return { userId: user.userId, role: user.role };
}

function handleError(err: unknown, res: Response, fallbackMessage: string) {
  if (err instanceof ForbiddenError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  res.status(500).json({ error: fallbackMessage });
}

export async function addProviderKeyHandler(req: Request, res: Response) {
  try {
    const keyDoc = await addProviderKey(req.body, getRequester(req));

    res.json({
      success: true,
      key: {
        _id: keyDoc._id,
        provider: keyDoc.provider,
        keyPrefix: keyDoc.keyPrefix,
        isSystem: keyDoc.isSystem,
        isActive: keyDoc.isActive,
      },
    });
  } catch (err) {
    handleError(err, res, "Failed to add provider key");
  }
}

export async function listProviderKeysHandler(req: Request, res: Response) {
  try {
    const keys = await listProviderKeys(getRequester(req));
    res.json(keys);
  } catch (err) {
    handleError(err, res, "Failed to fetch provider keys");
  }
}

export async function getProviderKeyHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const key = await getProviderKeyById(req.params.id, getRequester(req));

    if (!key) {
      return res.status(404).json({ error: "Provider key not found" });
    }

    res.json(key);
  } catch (err) {
    handleError(err, res, "Server error");
  }
}

export async function updateProviderKeyHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const key = await updateProviderKey(req.params.id, req.body, getRequester(req));

    if (!key) {
      return res.status(404).json({ error: "Provider key not found" });
    }

    res.json({ success: true, key });
  } catch (err) {
    handleError(err, res, "Failed to update provider key");
  }
}

export async function deleteProviderKeyHandler(req: Request<{ id: string }>, res: Response) {
  try {
    const deleted = await deleteProviderKey(req.params.id, getRequester(req));

    if (!deleted) {
      return res.status(404).json({ error: "Provider key not found" });
    }

    res.json({ success: true });
  } catch (err) {
    handleError(err, res, "Server error");
  }
}
