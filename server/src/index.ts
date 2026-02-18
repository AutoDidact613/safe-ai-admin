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

app.post("/api/embed", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "missing text" });
    }

    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    res.json({
      embedding: response.data[0]?.embedding||[],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "embedding failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
