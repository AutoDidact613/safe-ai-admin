import "dotenv/config";

import express from "express";
import cors from "cors";
import compression from "compression";
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
import paymeRouter from "./routes/paymeRouter";
import contactRouter from "./routes/contactRouter";
import tenderBoardRouter from "./routes/tenderBoardRouter";
import contactTypeRoutes from "./routes/contactTypeRoutes"; // הייבוא של הקובץ שיצרת

import newsRouter from "./routes/newsRouter";
import articlesRouter from "./routes/articlesRouter";

import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { connectDatabase } from "./config/db";
import { authenticateToken, requireAdmin } from "./middleware/auth";
import postRoutes from './routes/postRoutes';
import logger from "./logger";
import path from 'path';
import tagRoutes from './routes/tagRoutes';
import uploadRouter from "./routes/uploadRoutes";
import cookieParser from 'cookie-parser';
import { initializeAutoPostBot } from './services/autoPostService';

const PORT = process.env.PORT || 3001;

const app = express();

// Enable CORS for all routes
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) ?? [];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser());

// דוחס (gzip) את כל התגובות מהשרת לפני שהן נשלחות ברשת - מקטין את גודל
// הנתונים שהלקוח צריך להוריד, ומשפר את מהירות הטעינה בעיקר בחיבורים איטיים
app.use(compression());

// הגדרה ל-50 מגה-בייט כדי להיות בטוחים
// verify שומר את ה-body הגולמי על req.rawBody - נדרש לאימות חתימת webhook
// של PayMe (paymeController.ts), שצריך לחשב HMAC על הבייטים המדויקים שהתקבלו.
app.use(express.json({
  limit: "50mb",
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString("utf8");
  },
}));
app.use(express.urlencoded({
  limit: "50mb",
  extended: true,
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString("utf8");
  },
}));

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
app.use("/organizations", paymeRouter); // PayMe wallet top-up (webhook route excluded from auth, see paymeRouter.ts)
app.use("/contact", contactRouter); // Contact form (requires authentication)
app.use("/contact-types", contactTypeRoutes); // Contact form types
app.use("/articles", articlesRouter);


// ===== Public routes for filter evaluation =====
app.use("/filter", filterRouter);
app.use("/tender-board", tenderBoardRouter);

// ===== Public AI News Routes =====
app.use("/api/news", newsRouter); // News routes are public

// ===== Proxy API Key Protected Routes (LiteLLM Proxy) =====
app.use("/v1", openaiRouter); // Uses proxyAuth middleware in the router



app.use('/api/posts', postRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/tags', tagRoutes);
app.use("/api/upload", uploadRouter);

app.use(errorHandler);


async function start() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    initializeAutoPostBot();

  } catch (err) {
    logger.error("Startup failed:", err);
    process.exit(1);
  }
}

export default app;
if (require.main === module) {
  start();
}


