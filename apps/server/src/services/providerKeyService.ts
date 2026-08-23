import * as repo from "../repositories/providerKeyRepository";

import { encryptSecret, getKeyPrefix } from "../utils/crypto";

export interface Requester {
  userId: string;
  role: string;
}

export class ForbiddenError extends Error {
  statusCode = 403;
}

function isAdmin(requester: Requester) {
  return requester.role === "admin";
}

function assertOwnership(key: any, requester: Requester) {
  if (isAdmin(requester)) return;

  if (key.isSystem || String(key.userId) !== String(requester.userId)) {
    throw new ForbiddenError("You do not have access to this provider key");
  }
}

export async function addProviderKey(data: any, requester: Requester) {
  const apiKey = data.apiKey?.trim();

  if (!apiKey) {
    throw new Error("apiKey is required");
  }

  // Only admins may create a "system" key or assign a key to another user.
  const admin = isAdmin(requester);
  const isSystem = admin ? !!data.isSystem : false;
  const userId = isSystem ? undefined : admin && data.userId ? data.userId : requester.userId;

  return repo.createProviderKey({
    userId,
    provider: data.provider,
    apiKeyEncrypted: encryptSecret(apiKey),
    keyPrefix: getKeyPrefix(apiKey),
    isSystem,
    isActive: true,
  });
}

export async function listProviderKeys(requester: Requester) {
  if (isAdmin(requester)) {
    return repo.getProviderKeys();
  }

  return repo.getProviderKeysByUser(requester.userId);
}

export async function getProviderKeyById(keyId: string, requester: Requester) {
  const key = await repo.getProviderKeyById(keyId);
  if (!key) return null;

  assertOwnership(key, requester);
  return key;
}

export async function updateProviderKey(keyId: string, data: any, requester: Requester) {
  const existing = await repo.getProviderKeyById(keyId);
  if (!existing) return null;

  assertOwnership(existing, requester);

  const update: Record<string, unknown> = {};

  if (typeof data.isActive === "boolean") {
    update.isActive = data.isActive;
  }

  if (data.apiKey) {
    const apiKey = data.apiKey.trim();
    update.apiKeyEncrypted = encryptSecret(apiKey);
    update.keyPrefix = getKeyPrefix(apiKey);
  }

  // Only an admin may flip a key's system/user scope.
  if (isAdmin(requester) && typeof data.isSystem === "boolean") {
    update.isSystem = data.isSystem;
  }

  return repo.updateProviderKey(keyId, update);
}

export async function deleteProviderKey(keyId: string, requester: Requester) {
  const existing = await repo.getProviderKeyById(keyId);
  if (!existing) return null;

  assertOwnership(existing, requester);
  return repo.deleteProviderKey(keyId);
}
