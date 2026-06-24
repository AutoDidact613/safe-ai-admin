import { ContactMessage } from "../models/ContactMessage"; // ודאי שהייבוא נכון
import mongoose from "mongoose"; // הוספנו את הייבוא הזה

export const saveMessage = async (data: any, userId: string) => {
  const message = new ContactMessage({
    ...data,
    // כאן הקסם: המרה של ה-string ל-ObjectId תקין
    userId: new mongoose.Types.ObjectId(userId) 
  });
  
  return await message.save();
};