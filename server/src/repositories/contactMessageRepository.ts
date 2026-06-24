import { ContactMessage } from "../models/ContactMessage";

export const create = async (data: any) => {
  return await ContactMessage.create(data);
};