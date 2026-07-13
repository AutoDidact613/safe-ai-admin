import { Organization } from "../models/organization";

export async function createOrganization(data: any) {
  return Organization.create(data);
}

export async function getOrganizations() {
  return Organization.find().populate("ownerId", "email name").lean();
}

export async function getOrganizationById(orgId: string) {
  return Organization.findById(orgId).populate("ownerId", "email name").lean();
}

export async function getOrganizationsByOwnerId(ownerId: string) {
  return Organization.find({ ownerId }).lean();
}

export async function updateOrganization(orgId: string, data: any) {
  return Organization.findByIdAndUpdate(orgId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deleteOrganization(orgId: string) {
  return Organization.findByIdAndDelete(orgId).lean();
}

export async function getPendingOrganizations() {
  return Organization.find({ status: "pending" }).populate("ownerId", "email name").lean();
}
