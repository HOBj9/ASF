import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUnit extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  pointId?: mongoose.Types.ObjectId | null;
  originUnitId?: mongoose.Types.ObjectId | null;
  name: string;
  nameAr?: string;
  symbol?: string;
  baseUnitId?: mongoose.Types.ObjectId | null;
  factor: number;
  isActive: boolean;
  isOverride?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      default: null,
      index: true,
    },
    originUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
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
    symbol: {
      type: String,
      trim: true,
      default: null,
    },
    baseUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
    },
    factor: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOverride: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

UnitSchema.index({ organizationId: 1, branchId: 1, pointId: 1, name: 1 }, { unique: true });

let Unit: Model<IUnit>;

if (mongoose.models.Unit) {
  Unit = mongoose.models.Unit;
} else {
  Unit = mongoose.model<IUnit>('Unit', UnitSchema);
}

export default Unit;
