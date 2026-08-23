import { Request, Response } from "express";
import { proxyAudioSpeech, proxyAudioTranscription, proxyChatCompletion, proxyImageGeneration, proxyResponses } from "../services/proxyService";
import logger from "../logger";

export async function chatCompletionHandler(req: Request, res: Response) {
  try {
    // Type assertion
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info("Is Body Complete?", JSON.stringify(req.body).endsWith("}"));
    try {
      logger.debug("📥 Request received:", {
        model: req.body.model,
        messagesCount: req.body.messages?.length,
      });

      const response = await proxyChatCompletion(user, req.body);

      logger.debug("📤 Response type:", typeof response);
      logger.info(
        "📤 Response keys:",
        response ? Object.keys(response) : "null",
      );

      // אם streaming
      if (req.body.stream) {
        logger.debug("🌊 Streaming response");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        if (response instanceof ReadableStream) {
          const reader = response.getReader();
          const push = async () => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            push();
          };
          push();
        }
        return;
      }

      // אם לא streaming
      logger.debug("💬 Non-streaming response, sending JSON");
      return res.json(response);
    } catch (error: any) {
      logger.error("❌ Chat completion error:", { error: error.message, stack: error.stack });
      return res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}


export async function responsesHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    logger.debug("📥 Responses API request:", {
      model: req.body.model,
      stream: req.body.stream,
    });

    const response = await proxyResponses(user, req.body);

    if (req.body.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (response instanceof ReadableStream) {
        const reader = response.getReader();
        const push = async () => {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
          push();
        };
        push();
      }
      return;
    }

    return res.json(response);
  } catch (error: any) {
    logger.error("❌ Responses API error:", { error: error.message, stack: error.stack });
    return res.status(500).json({ error: error.message });
  }
}


// ========== IMAGE GENERATION ==========
export async function imageGenerationHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    logger.debug("🖼️ Image generation request:", { model: req.body.model });

    const response = await proxyImageGeneration(user, req.body);
    return res.json(response);
  } catch (error: any) {
    logger.error("❌ Image generation error:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message });
  }
}


// ========== AUDIO TRANSCRIPTION ==========
export async function audioTranscriptionHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    // multer/busboy כבר עיבד את הקובץ - req.file קיים
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "Audio file is required" });

    logger.debug("🎙️ Transcription request:", {
      filename: file.originalname,
      size: file.size,
    });

    // בנה FormData מחדש לשליחה ל-LiteLLM
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([file.buffer], { type: file.mimetype }),
      file.originalname
    );
    formData.append("model", req.body.model || "whisper-1");
    if (req.body.language) formData.append("language", req.body.language);
    if (req.body.prompt) formData.append("prompt", req.body.prompt);
    if (req.body.response_format)
      formData.append("response_format", req.body.response_format);

    const response = await proxyAudioTranscription(
      user,
      formData,
      req.body.model
    );
    return res.json(response);
  } catch (error: any) {
    logger.error("❌ Transcription error:", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: error.message });
  }
}


// ========== AUDIO SPEECH (TTS) ==========
export async function audioSpeechHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    logger.debug("🔊 TTS request:", {
      model: req.body.model,
      voice: req.body.voice,
    });

    const { buffer, contentType } = await proxyAudioSpeech(user, req.body);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.byteLength);
    return res.send(Buffer.from(buffer));
  } catch (error: any) {
    logger.error("❌ TTS error:", { error: error.message, stack: error.stack });
    return res.status(500).json({ error: error.message });
  }
}