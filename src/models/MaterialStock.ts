import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaterialStock extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialStockSchema: Schema = new Schema(
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
      required: true,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      required: true,
      index: true,
    },
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

MaterialStockSchema.index({ pointId: 1, materialId: 1 }, { unique: true });

let MaterialStock: Model<IMaterialStock>;

if (mongoose.models.MaterialStock) {
  MaterialStock = mongoose.models.MaterialStock;
} else {
  MaterialStock = mongoose.model<IMaterialStock>('MaterialStock', MaterialStockSchema);
}

export default MaterialStock;
