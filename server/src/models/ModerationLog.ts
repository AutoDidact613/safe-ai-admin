import mongoose, { Schema, Document } from 'mongoose';

export interface IModerationLog extends Document {
  action: 'DELETE_COMMENT' | 'BLOCK_POST' | 'UNBLOCK_POST' | 'LOCK_POST' | 'UNLOCK_POST';
  adminId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId; // ה-ID של הפוסט או התגובה שנמחקו/נחסמו
  details: string; // פירוט חופשי (למשל: "מחק את התגובה של משה")
  createdAt: Date;
}

const ModerationLogSchema: Schema = new Schema({
  action: { type: String, required: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  details: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const ModerationLog = mongoose.model<IModerationLog>('ModerationLog', ModerationLogSchema);
export default ModerationLog;