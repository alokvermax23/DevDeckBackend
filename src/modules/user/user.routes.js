import { Router } from "express";
import { checkUsernameAvailability, updateUsername } from "./user.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/check-username", checkUsernameAvailability);
router.patch("/username", requireAuth, updateUsername);

export default router;
