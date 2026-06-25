import { ContactMessage } from "../models/ContactMessage"; 
import mongoose from "mongoose";
import * as repository from "../repositories/contactMessageRepository";

export const saveMessage = async (data: any, userId: string) => {
  const message = new ContactMessage({
    ...data,
    userId: new mongoose.Types.ObjectId(userId) 
  });
  
  return await message.save();
};

export const getRequestsByUserId = async (userId: string) => {
  return await repository.findByUserId(userId);
};

export const getRequestById = async (id: string) => {
  return await ContactMessage.findById(id);
};

export const closeRequestById = async (id: string, userId: string) => {
  return await repository.updateStatus(id, userId, "closed");
};

export const addReplyToRequest = async (id: string, senderId: string, text: string, senderRole: 'user' | 'admin') => {
  const reply = {
    senderId: new mongoose.Types.ObjectId(senderId),
    text,
    senderRole,
    createdAt: new Date()
  };
  
  return await repository.addReplyToRequest(id, reply);
};

