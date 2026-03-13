import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationTemplate extends Document {
  name: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.VerificationTemplate ||
  mongoose.model<IVerificationTemplate>('VerificationTemplate', VerificationTemplateSchema);
