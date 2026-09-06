import { Request, Response } from "express";
import {
  createEmbedding,
  getEmbeddings,
} from "../services/filterService";

import {
  createProfile,
  getProfiles,
} from "../services/profileService";
import { evaluateText } from "../workflows/input/evaluate";

export async function healthHandler(_req: Request, res: Response) {
  res.send("AI Filter Service running");
}

export async function getEmbeddingsHandler(req: Request, res: Response) {
  try {
    const categories = Array.isArray(req.query.categories)
      ? (req.query.categories as string[])
      : typeof req.query.categories === "string"
      ? [req.query.categories]
      : [];

    const data = await getEmbeddings(categories);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch embeddings" });
  }
}

export async function postEmbeddingHandler(req: Request, res: Response) {
  try {
    await createEmbedding(req.body);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function postAIProfileHandler(req: Request, res: Response) {
  try {
    const profile = await createProfile(req.body);
    res.json({ success: true, profile });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}

export async function getAIProfilesHandler(_req: Request, res: Response) {
  const profiles = await getProfiles();
  res.json(profiles);
}

export async function evaluateHandler(req: Request, res: Response) {
  try {
    const result = await evaluateText(req.body);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}