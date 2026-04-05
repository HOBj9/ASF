import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  trackingIngressStatuses,
  trackingProviders,
  type TrackingIngressStatus,
  type TrackingProvider,
} from '@/lib/tracking/types';

export interface ITrackingIngressMessage extends Document {
  provider: TrackingProvider;
  branchId?: mongoose.Types.ObjectId | null;
  vehicleId?: mongoose.Types.ObjectId | null;
  bindingId?: mongoose.Types.ObjectId | null;
  providerMessageId: string;
  rawPayload: Record<string, any>;
  receivedAt: Date;
  processedAt?: Date | null;
  status: TrackingIngressStatus;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingIngressMessageSchema = new Schema(
  {
    provider: {
      type: String,
      enum: trackingProviders,
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
      index: true,
    },
    bindingId: {
      type: Schema.Types.ObjectId,
      ref: 'TrackingBinding',
      default: null,
      index: true,
    },
    providerMessageId: {
      type: String,
      required: true,
      trim: true,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: trackingIngressStatuses,
      default: 'received',
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TrackingIngressMessageSchema.index({ provider: 1, providerMessageId: 1 }, { unique: true });
TrackingIngressMessageSchema.index({ provider: 1, receivedAt: -1 });
TrackingIngressMessageSchema.index({ branchId: 1, receivedAt: -1 });

let TrackingIngressMessage: Model<ITrackingIngressMessage>;

if (mongoose.models.TrackingIngressMessage) {
  TrackingIngressMessage = mongoose.models.TrackingIngressMessage as Model<ITrackingIngressMessage>;
} else {
  TrackingIngressMessage = mongoose.model<ITrackingIngressMessage>(
    'TrackingIngressMessage',
    TrackingIngressMessageSchema
  );
}

export default TrackingIngressMessage;
