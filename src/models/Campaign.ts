import mongoose, { Document, Model, Schema } from 'mongoose';

export type CampaignStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ICampaign extends Document {
  title: string;
  sessionName: string;
  messages: string[];
  phoneNumbers: string[];
  status: CampaignStatus;
  statistics: {
    total: number;
    sent: number;
    failed: number;
    delivered: number;
    pending: number;
  };
  startedAt?: Date | null;
  completedAt?: Date | null;
  estimatedCompletionTime?: Date | null;
  userId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    sessionName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    messages: {
      type: [String],
      default: [],
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    statistics: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    estimatedCompletionTime: {
      type: Date,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CampaignSchema.index({ userId: 1, createdAt: -1 });

const Campaign =
  (mongoose.models.Campaign as Model<ICampaign>) ||
  mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
