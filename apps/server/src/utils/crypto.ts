import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is not defined");
}

const keyBuffer = Buffer.from(ENCRYPTION_KEY, "hex");

if (keyBuffer.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
}

export function generateApiKey(prefix = "sk-safeai"): string {
  return `${prefix}-${crypto.randomBytes(24).toString("hex")}`;
}

export function hashApiKey(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function getKeyPrefix(value: string, prefixLength = 12): string {
  return value.slice(0, prefixLength);
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    keyBuffer,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}