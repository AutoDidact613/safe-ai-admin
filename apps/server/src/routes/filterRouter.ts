import express from "express";
import { evaluateHandler } from "../controllers/filterController";

const router = express.Router();


router.get("/health", (_req, res) => {
  res.send("AI Filter Service running");
});

router.post("/evaluate", evaluateHandler);

export default router;