import express from "express";
import { 
  addProviderKeyHandler,
  listProviderKeysHandler,
  getProviderKeyHandler,
  updateProviderKeyHandler,
  deleteProviderKeyHandler
} from "../controllers/providerKeyController";

const router = express.Router();

router.post("/", addProviderKeyHandler);
router.get("/", listProviderKeysHandler);
router.get("/:id", getProviderKeyHandler);
router.put("/:id", updateProviderKeyHandler);
router.delete("/:id", deleteProviderKeyHandler);

export default router;
