import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IVerificationTemplate extends Document {
  name: string;
  content: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationTemplateSchema = new Schema<IVerificationTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const VerificationTemplate =
  (mongoose.models.VerificationTemplate as Model<IVerificationTemplate>) ||
  mongoose.model<IVerificationTemplate>('VerificationTemplate', VerificationTemplateSchema);

export default VerificationTemplate;
