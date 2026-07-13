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

export async function updateUser(userId: string, data: any) {
  return User.findByIdAndUpdate(userId, data, {
    new: true,
    runValidators: true,
  }).lean();
}

export async function deleteUser(userId: string) {
  return User.findByIdAndDelete(userId).lean();
}
