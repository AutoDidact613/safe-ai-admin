/**
 * server/src/config/database.ts
 */

import mongoose from "mongoose";
import logger from "../logger";

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/filtersdk";

export async function connectDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 1) {
      logger.info("MongoDB already connected");
      return;
    }

    logger.info("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI);

    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error("Mongo connection failed", err);
    throw err;
  }
}