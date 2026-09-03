import { Schema, model, Document } from 'mongoose';

export interface IAttachment extends Document {
  url: string;
  type: 'image' | 'video';
  status: 'pending' | 'linked';
  userId: Schema.Types.ObjectId;
  uploadedAt: Date;
  contactMessageId?: Schema.Types.ObjectId;
}

const attachmentSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  status: { type: String, enum: ['pending', 'linked'], default: 'pending' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  contactMessageId: { type: Schema.Types.ObjectId, ref: 'ContactMessage' },
});

export const Attachment = model<IAttachment>('Attachment', attachmentSchema, 'attachments');
