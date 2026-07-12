import mongoose, { Schema, Document } from 'mongoose';

export interface Itag extends Document {
  name: string;
}

const tagSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true } 
}, { timestamps: true }); // אופציונלי: מוסיף אוטומטית שדות של זמן יצירה ועדכון (createdAt)

export default mongoose.model<Itag>('tag', tagSchema);