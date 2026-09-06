import { Types } from 'mongoose';
import { Attachment } from '../models/Attachment';

export const create = async (data: any) => {
  const doc: Record<string, any> = {
    url: data.url,
    type: data.type,
    userId: new Types.ObjectId(data.userId),
  };
  return await Attachment.create(doc);
};

export const markLinkedByUrls = async (
  urls: string[],
  userId: string,
  contactMessageId: string,
) => {
  const filter: Record<string, any> = {
    url: { $in: urls },
    userId: new Types.ObjectId(userId),
    status: 'pending',
  };
  return await Attachment.updateMany(filter, {
    status: 'linked',
    contactMessageId: new Types.ObjectId(contactMessageId),
  });
};

export const findExpiredPending = async (cutoffDate: Date) => {
  const filter: Record<string, any> = { status: 'pending', uploadedAt: { $lt: cutoffDate } };
  return await Attachment.find(filter);
};

export const deleteById = async (id: string) => {
  return await Attachment.findByIdAndDelete(id);
};
