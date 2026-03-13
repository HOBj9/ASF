import mongoose, { Document, Model, Schema } from 'mongoose';

export type BulkSendJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface IBulkSendJob extends Document {
  jobId: string;
  sessionName: string;
  phoneNumbers: string[];
  message: string;
  status: BulkSendJobStatus;
  progress: {
    total: number;
    sent: number;
    failed: number;
    delivered: number;
    pending: number;
  };
  timeRemaining?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  userId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const BulkSendJobSchema = new Schema<IBulkSendJob>(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    sessionName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumbers: {
      type: [String],
      default: [],
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    progress: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    timeRemaining: {
      type: Number,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
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

BulkSendJobSchema.index({ userId: 1, createdAt: -1 });

const BulkSendJob =
  (mongoose.models.BulkSendJob as Model<IBulkSendJob>) ||
  mongoose.model<IBulkSendJob>('BulkSendJob', BulkSendJobSchema);

export default BulkSendJob;
