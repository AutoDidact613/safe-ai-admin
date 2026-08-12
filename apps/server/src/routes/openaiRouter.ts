import express from "express";
import { proxyAuth } from "../middleware/proxyAuth";
import { chatCompletionHandler, imageGenerationHandler } from "../controllers/openaiController";
import { rateLimiter } from "../middleware/rateLimiter";
import { responsesHandler } from "../controllers/openaiController";

import {
  anthropicMessagesHandler,
  anthropicCountTokensHandler,
  anthropicModelsHandler,
} from "../controllers/anthropicController";

const router = express.Router();

// Audio routes below are disabled; re-add the multer/audio handler imports if re-enabling them.


router.post(
  "/chat/completions",
  proxyAuth,
  rateLimiter,
  chatCompletionHandler
);


router.post("/responses", 
  proxyAuth,
  rateLimiter,
  responsesHandler);



  router.post("/images/generations",
      proxyAuth,
  rateLimiter,
    imageGenerationHandler);
// router.post(
//   "/audio/transcriptions",
//   proxyAuth,
//   rateLimiter,
//   upload.single("file"), // שם השדה חייב להיות "file" - תואם OpenAI API
//   audioTranscriptionHandler
// );
// router.post("/audio/speech", 
//    proxyAuth,
//   rateLimiter,
//   audioSpeechHandler);



// ===== Anthropic Compatible Routes for Claude Code =====
router.post("/messages", proxyAuth, rateLimiter, anthropicMessagesHandler);
router.post("/messages/count_tokens", proxyAuth, rateLimiter, anthropicCountTokensHandler);
router.get("/models", proxyAuth, anthropicModelsHandler);



export default router;