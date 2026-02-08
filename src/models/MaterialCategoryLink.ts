import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaterialCategoryLink extends Document {
  materialId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialCategoryLinkSchema: Schema = new Schema(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialCategory',
      required: true,
      index: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

MaterialCategoryLinkSchema.index({ materialId: 1, categoryId: 1 }, { unique: true });

let MaterialCategoryLink: Model<IMaterialCategoryLink>;

if (mongoose.models.MaterialCategoryLink) {
  MaterialCategoryLink = mongoose.models.MaterialCategoryLink;
} else {
  MaterialCategoryLink = mongoose.model<IMaterialCategoryLink>('MaterialCategoryLink', MaterialCategoryLinkSchema);
}

export default MaterialCategoryLink;
