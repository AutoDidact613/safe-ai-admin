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

/**
 * Return all organizations enriched with the number of users that belong to
 * each one. Used by the admin full-organizations view.
 */
export async function getOrganizationsWithUserCount() {
  return Organization.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "organizationId",
        as: "orgUsers",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: 1,
        description: 1,
        isActive: 1,
        walletBalance: 1,
        status: 1,
        settings: 1,
        createdAt: 1,
        updatedAt: 1,
        userCount: { $size: "$orgUsers" },
        ownerId: {
          _id: "$owner._id",
          email: "$owner.email",
          name: "$owner.name",
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);
}
