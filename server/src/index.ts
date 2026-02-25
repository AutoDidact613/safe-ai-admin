import "dotenv/config";
import express from "express";
import OpenAI from "openai";

console.log("KEY:", process.env.OPENAI_API_KEY?.slice(0, 5));

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});


//---------------continue613------------------
app.post("/api/embed", async (req, res) => {
  try {
    const { text } = req.body;
    console.log("embed", text);

    if (!text) {
      return res.status(400).json({ error: "missing text" });
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    res.json({
      embedding: response.data[0]?.embedding || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "embedding failed" });
  }
});

///--------------------filter-sdk-------------------
const mongoose = require("mongoose");
const uri  = "mongodb+srv://sh0504128171_db_user:bsdbsdbsd@autodidact-cluster.dbyvpmf.mongodb.net/?appName=autodidact-cluster";

mongoose.connect(`${uri}/filtersdk`)
  .then(() => console.log('Connected to MongoDB...'))
  .catch((err:any) => console.error('Could not connect to MongoDB:', err));


// מודל אמבדינג
const EmbeddingSchema = new mongoose.Schema({
  code: String,
  scope: String,
  allowedVectors: [Number], // מערך של מספרים
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
// שליפת אמבדינג לפי תחומים
app.get("/getFilterEmbedding/:scopes", async (req, res) => {
  try {
    const scopesArray = req.params.scopes.split(',');
    // שליפה מטבלת Embedding (ולא Prompt כפי שהיה בטעות)
    const data = await Embedding.find({ scope: { $in: scopesArray } });
    res.json(data);
  } catch (error) {
    res.status(500).send("Error fetching embeddings");
  }
});

// שליפת פרומפטים לפי תחומים
app.get("/getFilterPrompts/:scopes", async (req, res) => {
  try {
    const scopesArray = req.params.scopes.split(',');
    const prompts = await Prompt.find({ scope: { $in: scopesArray } });
    res.json(prompts);
  } catch (error) {
    res.status(500).send("Error fetching prompts");
  }
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


