import mongoose, { Document, Model, Schema } from 'mongoose';

export type SessionStatus = 'pending' | 'active' | 'terminated';

export interface ISession extends Document {
  sessionName: string;
  status: SessionStatus;
  userId?: mongoose.Types.ObjectId | null;
  isDefault: boolean;
  provider?: string | null;
  metadata?: Record<string, unknown>;
  lastActiveAt?: Date | null;
  terminatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'terminated'],
      required: true,
      default: 'pending',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    provider: {
      type: String,
      default: null,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    terminatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ sessionName: 1, userId: 1 });
SessionSchema.index({ isDefault: 1, createdAt: -1 });

const Session =
  (mongoose.models.Session as Model<ISession>) ||
  mongoose.model<ISession>('Session', SessionSchema);

export default Session;
