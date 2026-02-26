import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import filterRouter from "./filterRouter"; // ייבוא הראוטר
import logger from "./logger";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// הוספת הראוטר לאפליקציה
app.use("/filter", filterRouter); // הוספת הראוטר

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//---------------continue613------------------
app.post("/api/embed", async (req, res) => {
  logger.info("Received request for embed with text: " + req.body.text + " || date and time: " + new Date().toISOString());
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
