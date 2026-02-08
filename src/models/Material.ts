import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaterial extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  pointId?: mongoose.Types.ObjectId | null;
  originMaterialId?: mongoose.Types.ObjectId | null;
  name: string;
  nameAr?: string;
  sku: string;
  baseUnitId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  isOverride?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema: Schema = new Schema(
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
    originMaterialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
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
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    baseUnitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
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

MaterialSchema.index({ organizationId: 1, branchId: 1, pointId: 1, sku: 1 }, { unique: true });
MaterialSchema.index({ organizationId: 1, branchId: 1, pointId: 1, name: 1 });

let Material: Model<IMaterial>;

if (mongoose.models.Material) {
  Material = mongoose.models.Material as Model<IMaterial>;
  const branchPath = Material.schema.path('branchId') as any;
  if (branchPath) {
    branchPath.required(false);
    branchPath.default(null);
  }
} else {
  Material = mongoose.model<IMaterial>('Material', MaterialSchema);
}

export default Material;
