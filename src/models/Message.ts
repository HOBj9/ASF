import mongoose, { Document, Model, Schema } from 'mongoose';

export type MessageStatus = 'sent' | 'failed';
export type MessageSource = 'api' | 'campaign' | 'test' | 'auto_reply' | 'bulk_send';

export interface IMessage extends Document {
  sessionName: string;
  phoneNumber: string;
  messageContent: string;
  status: MessageStatus;
  source: MessageSource;
  messageId?: string | null;
  timestamp?: number | null;
  isRegistered?: boolean | null;
  attempts?: number | null;
  sessionState?: string | null;
  deliveryVerified?: boolean | null;
  alternativeMethodUsed?: boolean | null;
  campaignId?: mongoose.Types.ObjectId | null;
  campaignTitle?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  error?: string | null;
  errorDetails?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    sessionName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    messageContent: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
      index: true,
    },
    source: {
      type: String,
      enum: ['api', 'campaign', 'test', 'auto_reply', 'bulk_send'],
      default: 'api',
      index: true,
    },
    messageId: {
      type: String,
      default: null,
      trim: true,
    },
    timestamp: {
      type: Number,
      default: null,
    },
    isRegistered: {
      type: Boolean,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    sessionState: {
      type: String,
      default: null,
      trim: true,
    },
    deliveryVerified: {
      type: Boolean,
      default: null,
    },
    alternativeMethodUsed: {
      type: Boolean,
      default: null,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      default: null,
      index: true,
    },
    campaignTitle: {
      type: String,
      default: null,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    error: {
      type: String,
      default: null,
      trim: true,
    },
    errorDetails: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ userId: 1, createdAt: -1 });
MessageSchema.index({ sessionName: 1, createdAt: -1 });

const Message =
  (mongoose.models.Message as Model<IMessage>) ||
  mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
