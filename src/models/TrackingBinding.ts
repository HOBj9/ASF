import mongoose, { Document, Model, Schema } from 'mongoose';
import { trackingProviders, type TrackingProvider } from '@/lib/tracking/types';

export interface ITrackingBinding extends Document {
  branchId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  provider: TrackingProvider;
  externalId?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  capabilities: string[];
  isPrimary: boolean;
  isActive: boolean;
  tokenHash?: string | null;
  metadata?: Record<string, any> | null;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingBindingSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: trackingProviders,
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      trim: true,
      default: null,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    capabilities: {
      type: [String],
      default: [],
    },
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tokenHash: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TrackingBindingSchema.index(
  { branchId: 1, provider: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalId: { $exists: true, $type: 'string', $ne: '' },
    },
  }
);
TrackingBindingSchema.index(
  { provider: 1, tokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tokenHash: { $exists: true, $type: 'string', $ne: '' },
    },
  }
);
TrackingBindingSchema.index(
  { vehicleId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isPrimary: true,
    },
  }
);
TrackingBindingSchema.index(
  { provider: 1, userId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: {
      provider: 'mobile_app',
      userId: { $exists: true, $type: 'objectId' },
      isActive: true,
    },
  }
);
TrackingBindingSchema.index(
  { provider: 1, vehicleId: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: {
      provider: 'mobile_app',
      isActive: true,
    },
  }
);

let TrackingBinding: Model<ITrackingBinding>;

if (mongoose.models.TrackingBinding) {
  TrackingBinding = mongoose.models.TrackingBinding as Model<ITrackingBinding>;
} else {
  TrackingBinding = mongoose.model<ITrackingBinding>('TrackingBinding', TrackingBindingSchema);
}

export default TrackingBinding;
