const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pedagogical_system";

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
  console.log(`[db] מחובר ל-MongoDB (${MONGO_URI})`);
}

module.exports = { connectDatabase };
