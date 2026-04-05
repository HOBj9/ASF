import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  trackingProviders,
  zoneEventProviders,
  type TrackingProvider,
  type ZoneEventProvider,
} from '@/lib/tracking/types';

export type VehicleFuelType = 'gasoline' | 'diesel';

export interface IVehicle extends Document {
  branchId: mongoose.Types.ObjectId;
  name: string;
  plateNumber?: string;
  imei?: string | null;
  trackingProvider: TrackingProvider;
  acceptedTrackingProviders: TrackingProvider[];
  zoneEventProvider?: ZoneEventProvider | null;
  fuelType?: VehicleFuelType;
  fuelPricePerKm?: number;
  atharObjectId?: string;
  driverId?: mongoose.Types.ObjectId;
  routeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      trim: true,
      default: null,
    },
    imei: {
      type: String,
      trim: true,
      default: null,
    },
    trackingProvider: {
      type: String,
      enum: trackingProviders,
      default: 'athar',
      index: true,
    },
    acceptedTrackingProviders: {
      type: [
        {
          type: String,
          enum: trackingProviders,
        },
      ],
      default: undefined,
    },
    zoneEventProvider: {
      type: String,
      enum: zoneEventProviders,
      default: null,
      index: true,
    },
    fuelType: {
      type: String,
      enum: ['gasoline', 'diesel'],
      default: 'gasoline',
    },
    fuelPricePerKm: {
      type: Number,
      default: null,
    },
    atharObjectId: {
      type: String,
      trim: true,
      default: null,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

VehicleSchema.index(
  { branchId: 1, imei: 1 },
  {
    unique: true,
    partialFilterExpression: {
      imei: { $exists: true, $type: 'string', $ne: '' },
    },
  }
);
VehicleSchema.index({ branchId: 1, name: 1 });
VehicleSchema.index({ branchId: 1, zoneEventProvider: 1 });

VehicleSchema.pre('validate', function (next) {
  const trackingProvider =
    typeof this.trackingProvider === 'string' &&
    trackingProviders.includes(this.trackingProvider as TrackingProvider)
      ? (this.trackingProvider as TrackingProvider)
      : 'athar';

  if (!Array.isArray(this.acceptedTrackingProviders) || this.acceptedTrackingProviders.length === 0) {
    this.acceptedTrackingProviders = [trackingProvider];
  } else {
    const normalized = Array.from(
      new Set(
        this.acceptedTrackingProviders.filter((provider: unknown) =>
          typeof provider === 'string' && trackingProviders.includes(provider as TrackingProvider)
        )
      )
    ) as TrackingProvider[];
    this.acceptedTrackingProviders = normalized.length > 0 ? normalized : [trackingProvider];
  }

  if (
    this.zoneEventProvider == null ||
    !zoneEventProviders.includes(this.zoneEventProvider as ZoneEventProvider)
  ) {
    this.zoneEventProvider =
      trackingProvider === 'mobile_app' ? 'mobile_app' : 'athar';
  }

  next();
});

let Vehicle: Model<IVehicle>;

if (mongoose.models.Vehicle) {
  Vehicle = mongoose.models.Vehicle;
} else {
  Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
}

export default Vehicle;
