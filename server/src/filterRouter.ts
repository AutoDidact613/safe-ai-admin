import express, { Request, Response } from "express";
import mongoose from "mongoose";
import logger from "./logger";
import OpenAI from "openai";

/* ============================================================
   OpenAI Client
============================================================ */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

logger.info("OpenAI API Key loaded: " + !!process.env.OPENAI_API_KEY);

/* ============================================================
   Mongo Connection
============================================================ */

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/filtersdk";

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info("MongoDB connected successfully");
    await loadEmbeddingCache();
  } catch (err) {
    logger.error("Mongo connection failed", err);
  }
}

connectDatabase();

/* ============================================================
   Schemas
============================================================ */

const AIProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    allowedCategories: [{ type: String, lowercase: true, trim: true }],
    blockedCategories: [{ type: String, lowercase: true, trim: true }],

    thresholdAllowed: { type: Number, default: 0.25 },
    thresholdBlocked: { type: Number, default: 0.25 },
    similarityMargin: { type: Number, default: 0.05 },

    createdBy: { type: String, required: true },
    creatorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    contentPrompts: [String],
    behaviorPrompts: [String],
    knowledgePrompts: [String],
  },
  { timestamps: true },
);

const AIProfile = mongoose.model("AIProfile", AIProfileSchema, "ai-profiles");

const EmbeddingSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, lowercase: true, trim: true },
    originText: { type: String, required: true },
    vector: { type: [Number], required: true },
  },
  { timestamps: true },
);

const Embedding = mongoose.model("Embedding", EmbeddingSchema);

const PromptSchema = new mongoose.Schema(
  {
    code: String,
    category: String,
    content: String,
    description: String,
    status: { type: String, enum: ["לבדיקה", "בשימוש", "ישן"] },
  },
  { timestamps: true },
);

const Prompt = mongoose.model("Prompt", PromptSchema);

const EvaluationLogSchema = new mongoose.Schema(
  {
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: "AIProfile" },
    text: String,
    vectorScores: {
      bestAllowed: Number,
      bestBlocked: Number,
    },
    initialDecision: String, // 'allowed', 'blocked-category', 'low-confidence'
    llmFinalDecision: String, // 'allowed' or 'blocked'
    isManuallyReviewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const EvaluationLog = mongoose.model("EvaluationLog", EvaluationLogSchema);
/* ============================================================
   Embedding Cache
============================================================ */

const embeddingCache: Record<string, number[][]> = {};

async function loadEmbeddingCache() {
  const categories = await Embedding.distinct("category");

  for (const category of categories) {
    const docs = await Embedding.find({ category }).lean();

    embeddingCache[category] = docs.map((d) => d.vector);
  }

  logger.info(
    "Embedding cache loaded: " + Object.keys(embeddingCache).join(", "),
  );
}
/* ============================================================
   Router
============================================================ */

const router = express.Router();

router.get("/health", (_req, res) => {
  res.send("AI Filter Service running");
});

/* ================================
   Embedding CRUD
================================ */

router.get("/embeddings", async (req: Request, res: Response) => {
  try {
    const categories = req.query.categories;

    const categoriesArray: string[] = Array.isArray(categories)
      ? (categories as string[])
      : typeof categories === "string"
        ? [categories]
        : [];

    const data = await Embedding.find({
      category: { $in: categoriesArray },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch embeddings" });
  }
});

router.post("/embeddings", async (req: Request, res: Response) => {
  try {
    const { category, type, originText } = req.body;

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: originText,
    });

    const vector = response.data?.[0]?.embedding;
    if (!vector) return res.status(500).json({ error: "Embedding failed" });

    await Embedding.create({ category, originText, vector });

    embeddingCache[category] ??= [];
    embeddingCache[category].push(vector);

    res.json({ success: true });
  } catch (err) {
    logger.error("Embedding creation error", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   AI Profiles
================================ */

router.post("/ai-profiles", async (req, res) => {
  try {
    const profile = await AIProfile.create(req.body);
    res.json({ success: true, profile });
  } catch (err) {
    logger.error("Create profile error", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/ai-profiles", async (_req, res) => {
  const profiles = await AIProfile.find().sort({ createdAt: -1 });
  res.json(profiles);
});

/* ================================
   Filtering
================================ */

router.post("/evaluate", async (req, res) => {
  try {
    const { profileId, text, auditDisabled } = req.body;

    if (!profileId || !text) {
      return res.status(400).json({
        error: "profileId and text are required",
      });
    }

    const profile = await AIProfile.findById(profileId);

    if (!profile) {
      return res.status(404).json({
        error: "AIProfile not found",
      });
    }

    /* =========================
       Create embedding
    ========================= */

    // const response = await openai.embeddings.create({
    //   model: "text-embedding-3-small",
    //   input: text,
    // });

    // const inputVector = response.data?.[0]?.embedding;

    // if (!inputVector) {
    //   return res.status(500).json({
    //     error: "Embedding failed",
    //   });
    // }

    // let bestAllowed = 0;
    // let bestBlocked = 0;

    /* =========================
       Check allowed categories
    ========================= */

    // for (const category of profile.allowedCategories) {
    //   const vectors = embeddingCache[category];
    //   if (!vectors) continue;

    //   for (const vector of vectors) {
    //     const score = cosineSimilarity(inputVector, vector);
    //     if (score > bestAllowed) bestAllowed = score;
    //   }
    // }

    /* =========================
       Check blocked categories
    ========================= */

    // for (const category of profile.blockedCategories) {
    //   const vectors = embeddingCache[category];
    //   if (!vectors) continue;

    //   for (const vector of vectors) {
    //     const score = cosineSimilarity(inputVector, vector);
    //     if (score > bestBlocked) bestBlocked = score;
    //   }
    // }

    // const diff = bestAllowed - bestBlocked;

    // logger.info(
    //   `Profile=${profile.name} | allowed=${bestAllowed.toFixed(
    //     4,
    //   )} blocked=${bestBlocked.toFixed(4)} diff=${diff.toFixed(4)}`,
    // );

    /* =========================
       Decision Logic
    ========================= */

    let finalAllowed = false;
    let reason = "low-confidence";

    // // לוגיקה בסיסית של ה-Embeddings
    // if (bestBlocked > profile.thresholdBlocked && bestBlocked > bestAllowed) {
    //   reason = "blocked-category";
    // } else if (
    //   bestAllowed > profile.thresholdAllowed &&
    //   diff > profile.similarityMargin
    // ) {
    //   finalAllowed = true;
    //   reason = "passed-vector";
    // }

    // שלב הגיבוי: אם נחסם או שיש ביטחון נמוך - שולחים ל-GPT
    if (!finalAllowed) {
      if (!auditDisabled) {
        logger.info(
          `Low confidence or blocked by vector. Consulting GPT-4o-mini...`,
        );
      }
      const isSafeByLLM = await getLLMDecision(
        text,
        profile.name,
        profile.allowedCategories.join(", ") +
          "" +
          profile.blockedCategories.join(", "),
      );

      if (isSafeByLLM) {
        finalAllowed = true;
        reason = "allowed-by-llm";
      } else {
        reason = "blocked-by-llm";
      }
    }

    // שמירה לדאטה-בייס לצורך מעקב ושיפור המערכת בעתיד
    if (!auditDisabled) {
      await EvaluationLog.create({
        profileId: profile._id,
        text,
        vectorScores: { bestAllowed: 0, bestBlocked: 0 }, // ערכים אלה צריכים להתעדכן אם ה-embeddings יופעלו
        initialDecision: reason,
        llmFinalDecision: finalAllowed ? "allowed" : "blocked",
      });
    }
    return res.json({
      allowed: finalAllowed,
      reason: reason,
    });
  } catch (err) {
    logger.error("Evaluate error", err);
    res.status(500).json({ error: "Server error" });
  }
});
/* ============================================================
   Helpers
============================================================ */

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! ** 2;
    normB += b[i]! ** 2;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

async function getLLMDecision(
  text: string,
  profileName: string,
  profileDesc: string,
): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content filter for the profile: ${profileName} - ${profileDesc}.
           Your task is to determine if the text is safe and appropriate according to conservative education values. 
           In your response, do not reference the following topics in any way: <Other religions besides orthodox jewisem, relationships with women, sexual relations, Sexual exploitation or harassment, rape, sex, violent, immodest, romantic, intimate content, including innuendo, venereal diseases, fertility, pills, gynecology,impossible to answer the question without referencing these forbidden topics, respond only with: blocked.
           Even if the prohibited topics are requested inside a data structure such as an object, array, HTML page, or any other programming-related context, do not respond to them.           
          Corresponding to the profile's values:
           Respond only with "allowed" or "blocked".`,
        },
        { role: "user", content: text },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    // שימוש ב-Optional Chaining (?) ובדיקת קיום תוכן
    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return false; // אם אין תוכן, נחמיר ונחסום
    }

    const decision = content.toLowerCase().trim();
    return decision === "allowed";
  } catch (error) {
    logger.error("LLM Decision failed", error);
    return false;
  }
}

export default router;
