import { Types } from 'mongoose';
import { ContactMessage } from "../models/ContactMessage";

export const create = async (data: any) => {
  return await ContactMessage.create(data);
};


export const findByUserId = async (userId: string) => {
  const query: Record<string, unknown> = { userId: userId };
  return await ContactMessage.find(query).sort({ createdAt: -1 });
};



export const updateStatus = async (id: string, userId: string, status: string, isAdmin = false) => {
  const objectId = new Types.ObjectId(id);
   const filter: Record<string, any> = isAdmin
    ? { _id: objectId }
    : { _id: objectId, userId: new Types.ObjectId(userId) };


  return await ContactMessage.findOneAndUpdate(
    filter,
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

export const deleteRequestById = async (id: string) => {
  const objectId = new Types.ObjectId(id);
  return await ContactMessage.findByIdAndDelete(objectId);
};
