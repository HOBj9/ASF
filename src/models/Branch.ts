import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  branchTypeLabel?: string;
  governorate?: string;
  areaName?: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone: string;
  atharKey?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
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
    branchTypeLabel: {
      type: String,
      trim: true,
      default: null,
    },
    governorate: {
      type: String,
      trim: true,
      default: null,
    },
    areaName: {
      type: String,
      trim: true,
      default: null,
    },
    addressText: {
      type: String,
      trim: true,
      default: null,
    },
    centerLat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    centerLng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    timezone: {
      type: String,
      default: 'Asia/Damascus',
    },
    atharKey: {
      type: String,
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

BranchSchema.index({ organizationId: 1, name: 1 });

let Branch: Model<IBranch>;

if (mongoose.models.Branch) {
  Branch = mongoose.models.Branch;
} else {
  Branch = mongoose.model<IBranch>('Branch', BranchSchema);
}

export default Branch;
