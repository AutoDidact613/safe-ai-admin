import express, { Request, Response } from "express";
import mongoose from "mongoose";
import logger from "./logger";
// התחברות למונגוס


const uri  = "mongodb+srv://sh0504128171_db_user:bsdbsdbsd@autodidact-cluster.dbyvpmf.mongodb.net/?appName=autodidact-cluster";

mongoose.connect(`${uri}/filtersdk`)
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB:', err));


// מודל אמבדינג
const EmbeddingSchema = new mongoose.Schema({
  code: String,
  scope: String,
  allowedVectors: [Number],
  blockedVectors: [Number],
  createdAt: { type: Date, default: Date.now },
  status: String,
});

const Embedding = mongoose.model("Embedding", EmbeddingSchema);

// מודל פרומפט
const PromptSchema = new mongoose.Schema({
  code: String,
  scope: String,
  content: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["לבדיקה", "בשימוש", "ישן"] },
});

const Prompt = mongoose.model("Prompt", PromptSchema);

// יצירת ראוטר
const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Filter Router is working!");
});

router.get(
  "/getFilterEmbedding/:scopes",
  async (req: Request, res: Response) => {
    logger.info(
      "Received request for getFilterEmbedding with scopes: " +
        req.query.scopes,
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
  },
);

// שליפת פרומפטים לפי תחומים
// /getFilterPrompts?scopes=כללי,תכנות
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

    const prompts = await Prompt.find({
      scope: { $in: scopesArray },
    });

    res.json(prompts);
  } catch (error) {
    res.status(500).send("Error fetching prompts");
  }
});

export default router;
