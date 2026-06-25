import { Types } from 'mongoose';
import { ContactMessage } from "../models/ContactMessage";

export const create = async (data: any) => {
  return await ContactMessage.create(data);
};


export const findByUserId = async (userId: string) => {
  const objectId = new Types.ObjectId(userId);
  return await ContactMessage.find({ userId: objectId as any }).sort({ createdAt: -1 });
};

export const updateStatus = async (id: string, userId: string, status: string) => {
  const objectId = new Types.ObjectId(id);
  const userObjectId = new Types.ObjectId(userId);
  
  return await ContactMessage.findOneAndUpdate(
    { _id: objectId, userId: userObjectId },
    { status: status },
    { new: true }
  );
};

  export const addReplyToRequest = async (id: string, replyData: any) => {
  const objectId = new Types.ObjectId(id);
  return await ContactMessage.findByIdAndUpdate(
    objectId,
    { $push: { replies: replyData } },
    { new: true }
  );
};
