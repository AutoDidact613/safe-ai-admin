import { Router } from "express";
import { triggerListHandler } from "../controllers/inquiryAgentController";

const router = Router();

router.post("/run/list", triggerListHandler);

export default router;
