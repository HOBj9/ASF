import mongoose, { Document, Model, Schema } from 'mongoose';
import { trackingProviders, type TrackingProvider } from '@/lib/tracking/types';

export interface ITrackingSample extends Document {
  provider: TrackingProvider;
  vehicleId: mongoose.Types.ObjectId;
  bindingId: mongoose.Types.ObjectId;
  recordedAt: Date;
  receivedAt: Date;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  altitude?: number | null;
  rawRefId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingSampleSchema = new Schema(
  {
    provider: {
      type: String,
      enum: trackingProviders,
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    bindingId: {
      type: Schema.Types.ObjectId,
      ref: 'TrackingBinding',
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    speed: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    altitude: {
      type: Number,
      default: null,
    },
    rawRefId: {
      type: Schema.Types.ObjectId,
      ref: 'TrackingIngressMessage',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TrackingSampleSchema.index({ bindingId: 1, recordedAt: 1, lat: 1, lng: 1 }, { unique: true });
TrackingSampleSchema.index({ vehicleId: 1, recordedAt: -1 });
TrackingSampleSchema.index({ bindingId: 1, recordedAt: -1 });

let TrackingSample: Model<ITrackingSample>;

if (mongoose.models.TrackingSample) {
  TrackingSample = mongoose.models.TrackingSample as Model<ITrackingSample>;
} else {
  TrackingSample = mongoose.model<ITrackingSample>('TrackingSample', TrackingSampleSchema);
}

export default TrackingSample;
