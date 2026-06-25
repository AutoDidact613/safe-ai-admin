import { Types } from 'mongoose';
import { ContactMessage } from "../models/ContactMessage";

export const create = async (data: any) => {
  return await ContactMessage.create(data);
};


export const findByUserId = async (userId: string) => {
  const objectId = new Types.ObjectId(userId);
  return await ContactMessage.find({ userId: objectId as any }).sort({ createdAt: -1 });
};