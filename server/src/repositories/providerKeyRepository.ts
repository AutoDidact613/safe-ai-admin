import logger from "../logger";
import { ProviderKey } from "../models/providerKey";

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

export async function getProviderKeyByOrgAndProvider(
  organizationId: string,
  provider: string,
) {
  return ProviderKey.findOne({
    organizationId,
    provider,
    isActive: true,
  });
}

export async function getProviderKeysByOrganization(organizationId: string) {
  return ProviderKey.find({ organizationId }).lean();
}

export async function getProviderKeys() {
  return ProviderKey.find().lean();
}

export async function getProviderKeyById(keyId: string) {
  return ProviderKey.findById(keyId).lean();
}

export async function updateProviderKey(keyId: string, data: any) {
  return ProviderKey.findByIdAndUpdate(keyId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deleteProviderKey(keyId: string) {
  return ProviderKey.findByIdAndDelete(keyId).lean();
}
