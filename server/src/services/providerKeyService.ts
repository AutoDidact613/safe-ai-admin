import * as repo from "../repositories/providerKeyRepository";

import { encryptSecret, getKeyPrefix } from "../utils/crypto";

export async function addProviderKey(data: any) {
  const apiKey = data.apiKey?.trim();

  if (!apiKey) {
    throw new Error("apiKey is required");
  }

  return repo.createProviderKey({
    userId: data.userId,
    organizationId: data.organizationId,
    provider: data.provider,
    apiKeyEncrypted: encryptSecret(apiKey),
    keyPrefix: getKeyPrefix(apiKey),
    isSystem: data.isSystem || false,
    isActive: true,
  });
}

export async function listProviderKeys() {
  return repo.getProviderKeys();
}

export async function listProviderKeysForOrganization(organizationId: string) {
  return repo.getProviderKeysByOrganization(organizationId);
}

export async function getProviderKeyById(keyId: string) {
  return repo.getProviderKeyById(keyId);
}

export async function updateProviderKey(keyId: string, data: any) {
  if (data.apiKey) {
    const apiKey = data.apiKey.trim();
    data.apiKeyEncrypted = encryptSecret(apiKey);
    data.keyPrefix = getKeyPrefix(apiKey);
    delete data.apiKey;
  }

  return repo.updateProviderKey(keyId, data);
}

export async function deleteProviderKey(keyId: string) {
  return repo.deleteProviderKey(keyId);
}
