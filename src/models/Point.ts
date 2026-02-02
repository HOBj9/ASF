import mongoose, { Schema, Document, Model } from 'mongoose';

export type PointType = 'container' | 'station' | 'facility' | 'other';

export interface IPoint extends Document {
  branchId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  nameEn?: string;
  type: PointType;
  lat: number;
  lng: number;
  radiusMeters: number;
  zoneId?: string;
  addressText?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema: Schema = new Schema(
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
    nameAr: {
      type: String,
      trim: true,
      default: null,
    },
    nameEn: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: ['container', 'station', 'facility', 'other'],
      default: 'container',
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
    radiusMeters: {
      type: Number,
      default: 500,
      min: 10,
    },
    zoneId: {
      type: String,
      trim: true,
      default: null,
    },
    addressText: {
      type: String,
      trim: true,
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

PointSchema.index({ branchId: 1, name: 1 });
PointSchema.index({ branchId: 1, zoneId: 1 });
PointSchema.index({ branchId: 1, lat: 1, lng: 1 });

let Point: Model<IPoint>;

if (mongoose.models.Point) {
  Point = mongoose.models.Point;
} else {
  Point = mongoose.model<IPoint>('Point', PointSchema);
}

export default Point;
