import mongoose, { Schema, Document, Model } from 'mongoose';

export type ZoneEventType = 'zone_in' | 'zone_out';

export interface IZoneEvent extends Document {
  branchId: mongoose.Types.ObjectId;
  vehicleId?: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  pointId?: mongoose.Types.ObjectId;
  zoneId?: string;
  imei?: string;
  atharEventId?: string;
  name?: string;
  driverName?: string;
  type: ZoneEventType;
  eventTimestamp?: Date;
  receivedAt: Date;
  rawPayload?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneEventSchema: Schema = new Schema(
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
      default: null,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      default: null,
      index: true,
    },
    zoneId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    imei: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    atharEventId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    driverName: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: ['zone_in', 'zone_out'],
      required: true,
    },
    eventTimestamp: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ZoneEventSchema.index({ branchId: 1, atharEventId: 1 });
ZoneEventSchema.index({ branchId: 1, zoneId: 1, imei: 1, eventTimestamp: 1 });

let ZoneEvent: Model<IZoneEvent>;

if (mongoose.models.ZoneEvent) {
  ZoneEvent = mongoose.models.ZoneEvent;
} else {
  ZoneEvent = mongoose.model<IZoneEvent>('ZoneEvent', ZoneEventSchema);
}

export default ZoneEvent;
