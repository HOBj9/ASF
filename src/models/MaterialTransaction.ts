import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaterialTransactionType = 'in' | 'out' | 'adjust';

export interface IMaterialTransaction extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  materialId: mongoose.Types.ObjectId;
  type: MaterialTransactionType;
  quantity: number;
  unitId?: mongoose.Types.ObjectId | null;
  quantityBase: number;
  deltaBase: number;
  balanceAfter: number;
  transferId?: string | null;
  relatedPointId?: mongoose.Types.ObjectId | null;
  note?: string;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialTransactionSchema: Schema = new Schema(
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
    type: {
      type: String,
      enum: ['in', 'out', 'adjust'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
    },
    quantityBase: {
      type: Number,
      required: true,
    },
    deltaBase: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    transferId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    relatedPointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MaterialTransactionSchema.index({ pointId: 1, materialId: 1, createdAt: -1 });
MaterialTransactionSchema.index({ branchId: 1, createdAt: -1 });

let MaterialTransaction: Model<IMaterialTransaction>;

if (mongoose.models.MaterialTransaction) {
  MaterialTransaction = mongoose.models.MaterialTransaction;
} else {
  MaterialTransaction = mongoose.model<IMaterialTransaction>('MaterialTransaction', MaterialTransactionSchema);
}

export default MaterialTransaction;
