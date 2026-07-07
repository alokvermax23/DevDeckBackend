import express from "express";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();

// Global Middlewares
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use("/api/auth", authRoutes);

// Health check route
app.get("/", (req, res) => {
    res.json({ message: "DevDeck Backend API is Live 🚀" });
});

// Global Error Handler
app.use(errorHandler);

export default app;
