import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Session ||
  mongoose.model<ISession>('Session', SessionSchema);
