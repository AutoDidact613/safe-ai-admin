import { Router } from "express";
import {
  triggerApproveHandler,
  triggerEditHandler,
  triggerListHandler,
  triggerProcessHandler,
} from "../controllers/inquiryAgentController";

const router = Router();

router.post("/run/list", triggerListHandler);
router.post("/run/process", triggerProcessHandler);
router.post("/run/edit", triggerEditHandler);
router.post("/run/approve", triggerApproveHandler);

export default router;
