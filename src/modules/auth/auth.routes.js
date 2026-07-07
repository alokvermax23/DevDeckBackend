import { Router } from "express";
import { githublogin, githubCallback, googleLogin, googleCallback } from "./auth.controller.js";

const router = Router();
router.get("/github", githublogin);
router.get("/github/callback", githubCallback);

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);

export default router;
