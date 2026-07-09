import express from "express";
import {
  linkPlatform,
  unlinkPlatform,
  getLinkedPlatforms,
  refreshPlatform,
  refreshAllPlatforms,
} from "./platforms.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.post("/link", linkPlatform);
router.post("/refresh-all", refreshAllPlatforms);
router.delete("/:id", unlinkPlatform);
router.get("/", getLinkedPlatforms);
router.post("/:id/refresh", refreshPlatform);

export default router;
