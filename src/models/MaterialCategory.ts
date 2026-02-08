import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaterialCategory extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  pointId?: mongoose.Types.ObjectId | null;
  parentId?: mongoose.Types.ObjectId | null;
  originCategoryId?: mongoose.Types.ObjectId | null;
  name: string;
  nameAr?: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  isOverride?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialCategorySchema: Schema = new Schema(
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialCategory',
      default: null,
    },
    originCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialCategory',
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
    depth: {
      type: Number,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
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

MaterialCategorySchema.index({ organizationId: 1, branchId: 1, pointId: 1, name: 1 });
MaterialCategorySchema.index({ organizationId: 1, branchId: 1, pointId: 1, parentId: 1 });

let MaterialCategory: Model<IMaterialCategory>;

if (mongoose.models.MaterialCategory) {
  MaterialCategory = mongoose.models.MaterialCategory;
} else {
  MaterialCategory = mongoose.model<IMaterialCategory>('MaterialCategory', MaterialCategorySchema);
}

export default MaterialCategory;
