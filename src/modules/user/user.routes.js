import { Router } from "express";
import { checkUsernameAvailability, updateUsername, getUserProfile } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/check-username", checkUsernameAvailability);
router.patch("/username", requireAuth, updateUsername);
router.get("/me", requireAuth, getUserProfile);

export default router;
