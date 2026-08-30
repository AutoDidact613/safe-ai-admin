import { User } from "../models/user";

export async function createUser(data: any) {
  return User.create(data);
}


export async function getUserByProxyKeyHash(proxyKeyHash: string) {
  return User.findOne({
    proxyKeyHash,
    isActive: true,
  });
}

export async function getUsers() {
  return User.find({}, { proxyKeyHash: 0 }).lean();
}
export async function findUserByEmail(email:string) {
   return User.findOne({ email });

}

export async function getUserById(userId: string) {
  return User.findById(userId).lean();
}

export async function countUsersByOrganization(organizationId: string) {
  return User.countDocuments({ organizationId });
}

export async function getUsersByOrganization(organizationId: string) {
  return User.find({ organizationId }, { proxyKeyHash: 0 }).lean();
}

export async function removeUsersFromOrganization(organizationId: string) {
  await User.updateMany(
    { organizationId, role: "org_owner" },
    { organizationId: null, role: "user" }
  );
  await User.updateMany(
    { organizationId, role: { $ne: "org_owner" } },
    { organizationId: null }
  );
}

export async function updateUser(userId: string, data: any) {
  return User.findByIdAndUpdate(userId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function incrementUserMonthlySpend(userId: string, amount: number) {
  await User.updateOne(
    { _id: userId },
    { $inc: { "costLimits.currentMonthSpent": amount } }
  );
}

export async function resetUserMonthlyBudget(userId: string, resetDate: Date) {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "costLimits.currentMonthSpent": 0,
        "costLimits.lastResetDate": resetDate,
      },
    }
  );
}

export async function deleteUser(userId: string) {
  return User.findByIdAndDelete(userId).lean();
}
