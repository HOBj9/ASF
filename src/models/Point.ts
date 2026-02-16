import mongoose, { Schema, Document, Model } from 'mongoose';

export type PointType = 'container' | 'station' | 'facility' | 'other';

export interface IPoint extends Document {
  organizationId?: mongoose.Types.ObjectId | null;
  branchId?: mongoose.Types.ObjectId | null;
  createdByUserId?: mongoose.Types.ObjectId | null;
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: false,
      default: null,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
PointSchema.index({ organizationId: 1, branchId: 1 });

PointSchema.pre('validate', function (next) {
  const hasBranch = this.branchId != null && this.branchId.toString() !== '';
  const hasOrg = this.organizationId != null && this.organizationId.toString() !== '';
  if (!hasBranch && !hasOrg) {
    next(new Error('Point must have either branchId or organizationId'));
    return;
  }
  if (hasOrg && !hasBranch) {
    this.branchId = undefined;
  }
  next();
});

let Point: Model<IPoint>;

if (mongoose.models.Point) {
  Point = mongoose.models.Point;
} else {
  Point = mongoose.model<IPoint>('Point', PointSchema);
}

export default Point;
