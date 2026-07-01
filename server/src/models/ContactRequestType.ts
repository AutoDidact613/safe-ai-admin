import { Schema, model, Document } from 'mongoose';

export interface IContactRequestType extends Document {
  label: string; // למשל: "באג"
  value: string; // למשל: "bug"
  isActive: boolean;
}

const contactRequestTypeSchema = new Schema({
  label: { type: String, required: true },
  value: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
});

export const ContactRequestType = model<IContactRequestType>('ContactRequestType', contactRequestTypeSchema);