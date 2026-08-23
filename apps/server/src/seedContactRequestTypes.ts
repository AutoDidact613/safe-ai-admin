/**
 * server/src/seedContactRequestTypes.ts
 *
 * Seeds the ContactRequestType collection with the base set of request
 * types shown in the contact form's type dropdown (see docs/CONTACT_REQUEST_TYPES.md).
 *
 * Run from server/:  npx ts-node src/seedContactRequestTypes.ts
 *
 * Safe to re-run - each type is looked up by its unique `value` first, so
 * an existing document is left untouched instead of being duplicated.
 */

import mongoose from "mongoose";
import { ContactRequestType } from "./models/ContactRequestType";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/safeai";

interface SeedTypeSpec {
  label: string;
  value: string;
}

const SEED_TYPES: SeedTypeSpec[] = [
  { label: "באג", value: "bug" },
  { label: "שאלה כללית", value: "general" },
];

async function upsertSeedType(spec: SeedTypeSpec): Promise<void> {
  const existing = await ContactRequestType.findOne({ value: spec.value });
  if (existing) {
    console.log(`↷ Contact request type already exists, skipping: ${spec.value}`);
    return;
  }

  await ContactRequestType.create({
    label: spec.label,
    value: spec.value,
    isActive: true,
  });

  console.log(`✓ Created contact request type: ${spec.label} (${spec.value})`);
}

async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected.");

  try {
    for (const spec of SEED_TYPES) {
      await upsertSeedType(spec);
    }
    console.log("🎉 Seed complete.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

main();
