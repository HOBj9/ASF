import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  trackingConnectivityStatuses,
  trackingProviders,
  type TrackingConnectivityStatus,
  type TrackingProvider,
} from '@/lib/tracking/types';

export interface ITrackingVehicleState extends Document {
  vehicleId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  bindingId?: mongoose.Types.ObjectId | null;
  provider: TrackingProvider;
  lastProcessedAt?: Date | null;
  lastRecordedAt?: Date | null;
  lastReceivedAt?: Date | null;
  lastLocation?: {
    lat: number;
    lng: number;
  } | null;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
  insidePointIds: mongoose.Types.ObjectId[];
  connectivityStatus: TrackingConnectivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingVehicleStateSchema = new Schema(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    bindingId: {
      type: Schema.Types.ObjectId,
      ref: 'TrackingBinding',
      default: null,
      index: true,
    },
    provider: {
      type: String,
      enum: trackingProviders,
      required: true,
      index: true,
    },
    lastProcessedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastRecordedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastReceivedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastLocation: {
      type: new Schema(
        {
          lat: { type: Number, required: true, min: -90, max: 90 },
          lng: { type: Number, required: true, min: -180, max: 180 },
        },
        { _id: false }
      ),
      default: null,
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
    insidePointIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Point',
        },
      ],
      default: [],
    },
    connectivityStatus: {
      type: String,
      enum: trackingConnectivityStatuses,
      default: 'offline',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

TrackingVehicleStateSchema.index({ branchId: 1, provider: 1 });
TrackingVehicleStateSchema.index({ branchId: 1, lastReceivedAt: -1 });
TrackingVehicleStateSchema.index(
  { vehicleId: 1, provider: 1 },
  { unique: true, name: 'vehicleId_1_provider_1' }
);

let TrackingVehicleState: Model<ITrackingVehicleState>;

if (mongoose.models.TrackingVehicleState) {
  TrackingVehicleState = mongoose.models.TrackingVehicleState as Model<ITrackingVehicleState>;
} else {
  TrackingVehicleState = mongoose.model<ITrackingVehicleState>(
    'TrackingVehicleState',
    TrackingVehicleStateSchema
  );
}

export default TrackingVehicleState;
