/**
 * server/src/services/agentService.ts
 *
 * Business logic for the Agents Marketplace:
 * - Fetch and parse manifest.json from a GitHub repo
 * - Validate download_url is a real file (not an HTML page)
 * - Generate SVG icon via callAI (aiService)
 * - CRUD operations on Agent documents
 */

import { z } from "zod";
import { SortOrder } from "mongoose";
import { callAI } from "./aiService";
import { Agent, IAgent } from "../models/agent";
import {
  AgentManifest,
  AgentFilters,
  ValidateUrlResult,
} from "../types/agentTypes";
import logger from "../logger";

// ─── Manifest ────────────────────────────────────────────────────────────────

/**
 * Converts a GitHub repo URL to the raw manifest.json URL and fetches it.
 * Expects manifest.json at the root of the default branch (main).
 */
export async function fetchManifestFromRepo(
  repoUrl: string
): Promise<AgentManifest> {
  const match = repoUrl.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?\/?$/
  );
  if (!match) {
    throw new Error(
      "קישור הריפו אינו תקין. נדרש קישור GitHub בפורמט: https://github.com/user/repo"
    );
  }

  const [, user, repo] = match;
  const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/manifest.json`;

  const response = await fetch(rawUrl);
  if (!response.ok) {
    throw new Error(
      `לא נמצא קובץ manifest.json בריפו (${response.status}). ודאי שהקובץ קיים בשורש הענף main.`
    );
  }

  // FIX: response.json() מחזיר unknown — cast מפורש אחרי בדיקת שדות חובה
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error("קובץ manifest.json אינו JSON תקין.");
  }

  validateManifestFields(raw);
  return raw as AgentManifest;
}

function validateManifestFields(raw: unknown): void {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("manifest.json אינו אובייקט תקין.");
  }
  const required = ["name", "description", "creator_name", "download_url"] as const;
  const missing = required.filter(
    (f) => !((raw as Record<string, unknown>)[f])
  );
  if (missing.length > 0) {
    throw new Error(`manifest.json חסרים שדות חובה: ${missing.join(", ")}`);
  }
}

// ─── URL Validation ───────────────────────────────────────────────────────────

const FILE_EXTENSIONS = [
  ".exe", ".zip", ".tar.gz", ".tgz", ".dmg", ".pkg",
  ".deb", ".rpm", ".AppImage", ".msi", ".jar", ".whl",
];

export async function validateDownloadUrl(
  url: string
): Promise<ValidateUrlResult> {
  try {
    const response = await fetch(url, { method: "HEAD" });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return { valid: false, error: "הקישור מוביל לדף אינטרנט ולא לקובץ הורדה." };
    }

    const hasFileExtension = FILE_EXTENSIONS.some((ext) =>
      url.toLowerCase().includes(ext)
    );
    if (!hasFileExtension) {
      return {
        valid: false,
        error: "הקישור אינו מוביל לקובץ הורדה מוכר (.exe, .zip, .dmg וכו').",
      };
    }

    return { valid: true };
  } catch (err) {
    logger.error("validateDownloadUrl error:", err);
    return { valid: false, error: "לא ניתן לגשת לקישור. ודאי שהוא נגיש לציבור." };
  }
}

// ─── Icon Generation (via callAI) ─────────────────────────────────────────────

// סכמת Zod לפלט מה-AI — שדה אחד: svg string
const IconSchema = z.object({
  svg: z.string().describe("קוד SVG מלא של האייקון, מתחיל ב-<svg"),
});

export async function generateAgentIcon(
  name: string,
  description: string
): Promise<string> {
  const result = await callAI({
    userPrompt: `Agent name: "${name}"\nAgent description: "${description}"`,
    systemPrompt: `You are an SVG icon designer for AI agents.
Create a minimal SVG icon (viewBox="0 0 100 100") that visually represents the agent.
Rules:
- Simple geometric design, 2-3 colors max
- No text inside the SVG
- Full valid SVG markup only
Return JSON only:
{"svg": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>...</svg>"}`,
    schema: IconSchema,
    temperature: 0.7,
  });

  return result.svg;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createAgent(
  repositoryUrl: string,
  icon: string
): Promise<IAgent> {
  const manifest = await fetchManifestFromRepo(repositoryUrl);

  const urlValidation = await validateDownloadUrl(manifest.download_url);
  if (!urlValidation.valid) {
    throw new Error(
      `download_url בקובץ manifest.json אינו תקין: ${urlValidation.error}`
    );
  }

  const agent = new Agent({ ...manifest, icon });
  return agent.save();
}

export async function getAgents(filters: AgentFilters): Promise<{
  agents: IAgent[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const {
    search,
    professional_field,
    task,
    framework,
    sortBy = "downloads",
    page = 1,
    limit = 12,
  } = filters;

  const query: Record<string, unknown> = { isActive: true };

  if (search) query.$text = { $search: search };
  if (professional_field) query.professional_fields = professional_field;
  if (task) query.tasks_capable_of_performing = task;
  if (framework) query["technical_specifications.framework"] = framework;

  // FIX: הגדרת הטיפוס כ-[string, SortOrder][] כדי לתאום את חתימת Mongoose
  const sortMap: Record<string, [string, SortOrder][]> = {
    downloads: [["downloads", -1]],
    rating:    [["rating",    -1]],
    newest:    [["createdAt", -1]],
  };

  const skip = (page - 1) * limit;
  const sortKey = sortBy && sortMap[sortBy] ? sortBy : "downloads";

  const [agents, total] = await Promise.all([
    Agent.find(query).sort(sortMap[sortKey]).skip(skip).limit(limit),
    Agent.countDocuments(query),
  ]);

  return { agents, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getAgentById(id: string): Promise<IAgent | null> {
  return Agent.findById(id);
}

export async function incrementDownloads(id: string): Promise<void> {
  await Agent.findByIdAndUpdate(id, { $inc: { downloads: 1 } });
}

export async function getMarketplaceStats() {
  const [
    totalAgents,
    totalDownloads,
    topByDownloads,
    newest,
    topByRating,
    frameworkStats,
  ] = await Promise.all([
    Agent.countDocuments({ isActive: true }),
    Agent.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]),
    Agent.find({ isActive: true })
      .sort([["downloads", -1]])
      .limit(5)
      .select("name icon downloads creator_name"),
    Agent.find({ isActive: true })
      .sort([["createdAt", -1]])
      .limit(5)
      .select("name icon createdAt creator_name"),
    Agent.find({ isActive: true, ratingCount: { $gt: 0 } })
      .sort([["rating", -1]])
      .limit(5)
      .select("name icon rating ratingCount creator_name"),
    Agent.aggregate([
      {
        $match: {
          isActive: true,
          "technical_specifications.framework": { $ne: "" },
        },
      },
      { $group: { _id: "$technical_specifications.framework", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  return {
    totalAgents,
    totalDownloads: totalDownloads[0]?.total ?? 0,
    topByDownloads,
    newest,
    topByRating,
    frameworkStats,
  };
}