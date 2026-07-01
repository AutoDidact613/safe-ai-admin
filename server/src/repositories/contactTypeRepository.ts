import { ContactRequestType } from "../models/ContactRequestType";

export const getAllActiveTypes = async () => {
  return await ContactRequestType.find({ isActive: true }).sort({ label: 1 });
};