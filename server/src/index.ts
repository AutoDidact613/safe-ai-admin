import "dotenv/config";

import express from "express";
import cors from "cors";
import filterRouter from "./routes/filterRouter";
import profileRouter from "./routes/profileRouter";
import openaiRouter from "./routes/openaiRouter";
import userRouter from "./routes/userRouter";
import providerKeyRouter from "./routes/providerKeyRouter";
import authRouter from "./routes/authRouter";
import usageRouter from "./routes/usageRouter";
import adminStatsRouter from "./routes/adminStatsRouter";
import proxyKeyRouter from "./routes/proxyKeyRouter";
import promptRouter from "./routes/promptRouter";
import organizationRouter from "./routes/organizationRouter";
import contactRouter from "./routes/contactRouter";

import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { connectDatabase } from "./config/db";
import { authenticateToken, requireAdmin } from "./middleware/auth";
import logger from "./logger";

const PORT = process.env.PORT || 3001;

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// הגדרה ל-50 מגה-בייט כדי להיות בטוחים
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(requestLogger);



app.get("/health", (_req, res) => {
  res.send("OK");
});

// ===== Public Routes (No Authentication) =====
app.use("/auth", authRouter);

// ===== JWT Protected Routes (User Self-Management) =====
// Import the handler for self-profile updates
import { updateOwnProfileHandler } from "./controllers/userController";
app.patch("/users/:id", authenticateToken, updateOwnProfileHandler);
app.use("/usage", usageRouter); // Already has authenticateToken inside


// ===== JWT Protected Routes (Admin Panel & Management) =====
app.use("/users", authenticateToken, requireAdmin, userRouter);
app.use("/profiles", authenticateToken, profileRouter);
app.use("/provider-keys", authenticateToken, providerKeyRouter);
app.use("/proxy-key", proxyKeyRouter); // User's own proxy key management
app.use("/admin/stats", adminStatsRouter); // Admin stats already has auth middleware
app.use("/prompts", authenticateToken, promptRouter); // Prompt management (admin routes protected in router)
app.use("/organizations", organizationRouter); // Organization management (auth middleware in router)
app.use("/contact", contactRouter); // Contact form (requires authentication)


// ===== Public routes for filter evaluation =====
app.use("/filter", filterRouter);


// ===== Proxy API Key Protected Routes (LiteLLM Proxy) =====
app.use("/v1", openaiRouter); // Uses proxyAuth middleware in the router



app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

  } catch (err) {
    logger.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
