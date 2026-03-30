import mongoose, { Document, Model, Schema } from 'mongoose';
import { trackingProviders, type TrackingProvider } from '@/lib/tracking/types';

export interface ITrackingProviderConfig extends Document {
  branchId: mongoose.Types.ObjectId;
  provider: TrackingProvider;
  isEnabled: boolean;
  config?: Record<string, any> | null;
  legacyFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingProviderConfigSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: trackingProviders,
      required: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    config: {
      type: Schema.Types.Mixed,
      default: null,
    },
    legacyFallback: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

TrackingProviderConfigSchema.index({ branchId: 1, provider: 1 }, { unique: true });

let TrackingProviderConfig: Model<ITrackingProviderConfig>;

if (mongoose.models.TrackingProviderConfig) {
  TrackingProviderConfig = mongoose.models.TrackingProviderConfig as Model<ITrackingProviderConfig>;
} else {
  TrackingProviderConfig = mongoose.model<ITrackingProviderConfig>(
    'TrackingProviderConfig',
    TrackingProviderConfigSchema
  );
}

export default TrackingProviderConfig;
