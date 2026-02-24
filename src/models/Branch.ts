import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BranchLabels {
  branchLabel?: string;
  pointLabel?: string;
  vehicleLabel?: string;
  driverLabel?: string;
  routeLabel?: string;
  lineSupervisorLabel?: string;
  surveyLabel?: string;
  eventsReportLabel?: string;
  latestEventsLabel?: string;
}

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
  fuelPricePerKmGasoline?: number;
  fuelPricePerKmDiesel?: number;
  labels?: BranchLabels;
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
    fuelPricePerKmGasoline: {
      type: Number,
      default: null,
    },
    fuelPricePerKmDiesel: {
      type: Number,
      default: null,
    },
    labels: {
      branchLabel: { type: String, trim: true },
      pointLabel: { type: String, trim: true },
      vehicleLabel: { type: String, trim: true },
      driverLabel: { type: String, trim: true },
      routeLabel: { type: String, trim: true },
      lineSupervisorLabel: { type: String, trim: true },
      surveyLabel: { type: String, trim: true },
      eventsReportLabel: { type: String, trim: true },
      latestEventsLabel: { type: String, trim: true },
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
