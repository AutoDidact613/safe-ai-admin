/**
 * server/src/seedDevData.ts
 *
 * Baseline test-data seed script for local/dev environments (SCRUM-213).
 *
 * Creates, if not already present:
 *   - 4 users: 1 admin, 1 org_owner, 2 regular users - all email-verified
 *   - 1 approved organization, owned by the org_owner, with the 2 regular
 *     users attached as members, a non-zero walletBalance, and one
 *     WalletTransaction per PayMe status (pending/completed/failed)
 *   - 1 approved + public AI profile named "foo", scoped to allow
 *     programming/technical discussion instead of blocking it
 *   - 1 BYOK provider key (placeholder value) for the first regular user,
 *     so isActive / toggle / delete can be exercised from the UI
 *
 * Run from server/:  npx ts-node src/seedDevData.ts
 *
 * Safe to re-run - every record is looked up by its natural unique key
 * first, so existing data (seeded earlier, or already in the database)
 * is left untouched instead of being duplicated or wiped.
 *
 * SECURITY NOTE: DEV_SEED_PROVIDER_API_KEY below is a hardcoded placeholder,
 * not a real provider secret, and must stay that way - never replace it with
 * a real key here or commit one to git. After seeding, add a real key
 * through the UI at /provider-keys.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "./models/user";
import { Organization, AIProfile, WalletTransaction } from "./models";
import { ProviderKey } from "./models/providerKey";
import {
  encryptSecret,
  generateApiKey,
  getKeyPrefix,
  hashApiKey,
} from "./utils/crypto";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/safeai";
const SALT_ROUNDS = 10;

// Dev-only login password for the seeded accounts below. Not a production
// secret and not a provider key - just something to log in with locally.
const DEV_SEED_PASSWORD = "Dev-Seed-Pass-1!";

const DEV_SEED_ORG_NAME = "Foo Org";
const DEV_SEED_PROFILE_NAME = "foo";

// Non-zero so the wallet card and PayMe status/history views have something
// to show without requiring a real top-up first.
const DEV_SEED_ORG_WALLET_BALANCE = 250;

// Fixed requestIds (not crypto.randomUUID()) so re-running the seed finds
// these by their natural key instead of creating duplicates every time -
// same upsert-by-natural-key convention as the rest of this file.
const DEV_SEED_WALLET_TRANSACTIONS: Array<{
  requestId: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  payMeTransactionId?: string;
}> = [
  { requestId: "seed-payme-pending", amount: 40, status: "pending" },
  { requestId: "seed-payme-completed", amount: 100, status: "completed", payMeTransactionId: "seed-payme-txn-completed" },
  { requestId: "seed-payme-failed", amount: 25, status: "failed" },
];

// Obvious placeholder - not shaped like a real provider key, and must never
// be replaced with one. Real keys are added by the user via /provider-keys.
const DEV_SEED_PROVIDER_API_KEY = "REPLACE_ME_WITH_REAL_PROVIDER_KEY_VIA_UI";

interface SeedUserSpec {
  email: string;
  name: string;
  role: "admin" | "org_owner" | "user";
}

const SEED_USERS: [SeedUserSpec, SeedUserSpec, SeedUserSpec, SeedUserSpec] = [
  { email: "admin@example.com", name: "Foo Admin", role: "admin" },
  { email: "org-owner@example.com", name: "Foo Org Owner", role: "org_owner" },
  { email: "user-one@example.com", name: "Foo User One", role: "user" },
  { email: "user-two@example.com", name: "Foo User Two", role: "user" },
];

async function upsertSeedUser(spec: SeedUserSpec): Promise<any> {
  const email = spec.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`↷ User already exists, skipping: ${email}`);
    return existing;
  }

  const hashedPassword = await bcrypt.hash(DEV_SEED_PASSWORD, SALT_ROUNDS);

  // In production these proxy/LiteLLM fields are issued by the live LiteLLM
  // proxy during registration (see authService.register). Seeding must work
  // without a running LiteLLM instance, so we generate inert, randomly
  // derived placeholders instead - these are not real secrets and are never
  // used to call any real provider or proxy.
  const proxyApiKey = generateApiKey("sk-safeai-seed");
  const fakeLitellmKey = generateApiKey("sk-seed-litellm");

  const user = await User.create({
    email,
    password: hashedPassword,
    name: spec.name,
    role: spec.role,
    emailVerified: true,
    proxyKeyHash: hashApiKey(proxyApiKey),
    proxyKeyPrefix: getKeyPrefix(proxyApiKey),
    litellmKeyEncrypted: encryptSecret(fakeLitellmKey),
    litellmPrefix: getKeyPrefix(fakeLitellmKey),
    litellmToken: hashApiKey(fakeLitellmKey),
  });

  console.log(`✓ Created user (${spec.role}): ${email}`);
  return user;
}

async function upsertSeedOrganization(ownerId: any): Promise<any> {
  const existing = await Organization.findOne({ name: DEV_SEED_ORG_NAME });
  if (existing) {
    console.log(`↷ Organization already exists, skipping: ${DEV_SEED_ORG_NAME}`);
    return existing;
  }

  const organization = await Organization.create({
    name: DEV_SEED_ORG_NAME,
    description: "Seed organization for local development and testing.",
    ownerId,
    status: "approved",
    walletBalance: DEV_SEED_ORG_WALLET_BALANCE,
  });

  console.log(`✓ Created organization: ${DEV_SEED_ORG_NAME}`);
  return organization;
}

async function attachMembers(organizationId: any, memberIds: any[]): Promise<void> {
  await User.updateMany(
    { _id: { $in: memberIds }, organizationId: { $exists: false } },
    { $set: { organizationId } },
  );
}

async function upsertSeedProfile(creator: { id: string; email: string }): Promise<any> {
  const existing = await AIProfile.findOne({ name: DEV_SEED_PROFILE_NAME });
  if (existing) {
    console.log(`↷ Profile already exists, skipping: ${DEV_SEED_PROFILE_NAME}`);
    return existing;
  }

  const profile = await AIProfile.create({
    name: DEV_SEED_PROFILE_NAME,
    createdBy: creator.id,
    creatorEmail: creator.email,
    approvalStatus: "approved",
    visibility: "public",
    allowedCategories: [
      "programming",
      "software development",
      "debugging",
      "code review",
      "system architecture",
      "technical documentation",
      "ai development",
    ],
    blockedCategories: [],
    contentPrompts: [
      "Restrict responses to programming, software engineering, and general technical topics.",
    ],
    behaviorPrompts: [
      "Do not refuse, block, or filter a request solely because it is technical or code-related.",
    ],
    knowledgePrompts: [
      "Treat the user as a software developer asking about code, tools, frameworks, or system design.",
    ],
  });

  console.log(`✓ Created profile: ${DEV_SEED_PROFILE_NAME}`);
  return profile;
}

/**
 * Seeds one WalletTransaction per status (pending/completed/failed) against
 * the seed organization, so the top-up form, PaymeResultPage, and the
 * /wallet/payme/status/:transactionId endpoint all have realistic data to
 * develop and demo against without needing a real PayMe callback (SCRUM-243).
 */
async function upsertSeedWalletTransactions(organizationId: any): Promise<void> {
  for (const spec of DEV_SEED_WALLET_TRANSACTIONS) {
    const existing = await WalletTransaction.findOne({ requestId: spec.requestId });
    if (existing) {
      console.log(`↷ WalletTransaction already exists, skipping: ${spec.requestId}`);
      continue;
    }

    await WalletTransaction.create({
      organizationId,
      requestId: spec.requestId,
      amount: spec.amount,
      currency: "ILS",
      status: spec.status,
      ...(spec.payMeTransactionId ? { payMeTransactionId: spec.payMeTransactionId } : {}),
      ...(spec.status !== "pending" ? { completedAt: new Date() } : {}),
    });

    console.log(`✓ Created WalletTransaction (${spec.status}): ${spec.requestId}`);
  }
}

async function upsertSeedProviderKey(userId: any): Promise<any> {
  const existing = await ProviderKey.findOne({ userId, provider: "openai" });
  if (existing) {
    console.log("↷ Provider key already exists for seed user, skipping");
    return existing;
  }

  const key = await ProviderKey.create({
    userId,
    provider: "openai",
    apiKeyEncrypted: encryptSecret(DEV_SEED_PROVIDER_API_KEY),
    keyPrefix: getKeyPrefix(DEV_SEED_PROVIDER_API_KEY),
    isActive: true,
    isSystem: false,
  });

  console.log("✓ Created placeholder BYOK provider key for seed user (openai)");
  return key;
}

async function main() {
  console.log("🔄 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected.");

  try {
    const [admin, orgOwner, userOne, userTwo] = await Promise.all(
      SEED_USERS.map(upsertSeedUser),
    );

    const organization = await upsertSeedOrganization(orgOwner._id);

    if (String(orgOwner.organizationId || "") !== String(organization._id)) {
      orgOwner.organizationId = organization._id;
      await orgOwner.save();
    }
    await attachMembers(organization._id, [userOne._id, userTwo._id]);

    await upsertSeedWalletTransactions(organization._id);

    await upsertSeedProfile({ id: String(admin._id), email: admin.email });

    await upsertSeedProviderKey(userOne._id);

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
