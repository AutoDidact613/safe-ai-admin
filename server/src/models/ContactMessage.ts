import { Schema, model, Document } from 'mongoose';

export interface IContactMessage extends Document {
  title: string;
  description: string;
  requestType: string;
  userId: Schema.Types.ObjectId;
  createdAt: Date;
  status: 'open' | 'closed';
}

const contactMessageSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requestType: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'closed'], default: 'open' }
});

export const ContactMessage = model<IContactMessage>('ContactMessage', contactMessageSchema, 'contactmessages');