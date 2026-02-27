import express, { Request, Response } from "express";
import mongoose from "mongoose";
import logger from "./logger";
import OpenAI from "openai";

const embeddingCache: Record<
  string,
  { allowed: number[][]; blocked: number[][] }
> = {};

async function loadCache() {
  const scopes = await Embedding.distinct("scope");

  for (const scope of scopes) {
    const docs = await Embedding.find({ scope }).lean();

    embeddingCache[scope] = {
      allowed: docs.filter((d) => d.type === "allowed").map((d) => d.vector),
      blocked: docs.filter((d) => d.type === "blocked").map((d) => d.vector),
    };
  }

  console.log("Cache loaded:", Object.keys(embeddingCache));
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log("API KEY exists:", !!process.env.OPENAI_API_KEY);

const uri =
  "mongodb+srv://sh0504128171_db_user:bsdbsdbsd@autodidact-cluster.dbyvpmf.mongodb.net/filtersdk?retryWrites=true&w=majority";

async function startFilter() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB...");

    await loadCache();
  } catch (err) {
    console.error("Could not connect:", err);
  }
}

startFilter();


const EmbeddingSchema = new mongoose.Schema({
  scope: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["allowed", "blocked"],
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  vector: {
    type: [Number],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Embedding = mongoose.model("Embedding", EmbeddingSchema);

const PromptSchema = new mongoose.Schema({
  code: String,
  scope: String,
  content: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["לבדיקה", "בשימוש", "ישן"] },
});

const Prompt = mongoose.model("Prompt", PromptSchema);

console.log("Prompt collection:", Prompt.collection.name);
console.log("Embedding collection:", Embedding.collection.name);

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Filter Router is working!");
});

router.get("/getFilterEmbedding/", async (req: Request, res: Response) => {
  logger.info(
    "Received request for getFilterEmbedding with scopes: " + req.query.scopes,
  );
  try {
    const { scopes } = req.query;

    let scopesArray: string[] = [];

    if (Array.isArray(scopes)) {
      scopesArray = scopes as string[];
    } else if (typeof scopes === "string") {
      scopesArray = [scopes];
    }

    const data = await Embedding.find({
      scope: { $in: scopesArray },
    });

    res.json(data);
  } catch (error) {
    res.status(500).send("Error fetching embeddings");
  }
});


router.get("/getFilterPrompts", async (req: Request, res: Response) => {
  logger.info(
    "Received request for getFilterPrompts with scopes: " + req.query.scopes,
  );
  try {
    const { scopes } = req.query;

    let scopesArray: string[] = [];

    if (Array.isArray(scopes)) {
      scopesArray = scopes as string[];
    } else if (typeof scopes === "string") {
      scopesArray = [scopes];
    }
    logger.debug("Parsed scopes array: " + JSON.stringify(scopesArray));
    const prompts = await Prompt.find({
      scope: { $in: scopesArray },
    });

    res.json(prompts);
  } catch (error) {
    res.status(500).send("Error fetching prompts");
  }
});

router.post("/create-embedding", async (req, res) => {
  try {

    const { scope, type, topic } = req.body;


    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: topic,
    });


    const vector = response.data?.[0]?.embedding;

    if (!vector) {
      console.log("No vector returned");
      return res.status(500).json({ error: "Embedding generation failed" });
    }

    await Embedding.create({
      scope,
      type,
      topic,
      vector,
    });

    console.log("Saved to DB");

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/is-allowed", async (req, res) => {
  const { scope, text } = req.body;

  if (!embeddingCache[scope]) {
    return res.status(400).json({ error: "Scope not loaded" });
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const inputVector = response.data?.[0]?.embedding;
  if (!inputVector) {
    return res.status(500).json({ error: "Embedding failed" });
  }

  const { allowed, blocked } = embeddingCache[scope];

  const maxAllowed = Math.max(...allowed.map((v) => cosine(inputVector, v)));

  const maxBlocked = Math.max(...blocked.map((v) => cosine(inputVector, v)));

  const diff = maxAllowed - maxBlocked;

  const MIN_CONF = 0.75;
  const MIN_MARGIN = 0.05;

  if (maxBlocked > MIN_CONF && maxBlocked > maxAllowed) {
    return res.json({ allowed: false });
  }

  if (maxAllowed > MIN_CONF && diff > MIN_MARGIN) {
    return res.json({ allowed: true });
  }

  return res.json({ allowed: false });
});

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }

  if (a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) return 0;

  return dot / denominator;
}
export default router;
