import { ProviderKey } from "../models/providerKey";

// apiKeyEncrypted is excluded explicitly because these results are read
// with .lean(), which bypasses the schema's toJSON transform.
const PUBLIC_FIELDS = "-apiKeyEncrypted -__v";

export async function createProviderKey(data: any) {
  return ProviderKey.create(data);
}

export async function getProviderKeyByUserAndProvider(
  userId: string,
  provider: string,
) {
  return ProviderKey.findOne({
    userId,
    provider,
    isActive: true,
  });
}

export async function getSystemProviderKey(provider: string) {


  return ProviderKey.findOne({
    provider,
    isSystem: true,
    isActive: true,
  });
}

export async function getProviderKeys() {
  return ProviderKey.find().select(PUBLIC_FIELDS).lean();
}

export async function getProviderKeysByUser(userId: string) {
  return ProviderKey.find({ userId }).select(PUBLIC_FIELDS).lean();
}

export async function getProviderKeyById(keyId: string) {
  return ProviderKey.findById(keyId).select(PUBLIC_FIELDS).lean();
}

export async function updateProviderKey(keyId: string, data: any) {
  return ProviderKey.findByIdAndUpdate(keyId, data, {
    new: true,
    runValidators: true,
  }).select(PUBLIC_FIELDS).lean();
}

export async function deleteProviderKey(keyId: string) {
  return ProviderKey.findByIdAndDelete(keyId).lean();
}
