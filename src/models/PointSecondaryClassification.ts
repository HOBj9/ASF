import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointSecondaryClassification extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  primaryClassificationId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PointSecondaryClassificationSchema: Schema = new Schema(
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
    primaryClassificationId: {
      type: Schema.Types.ObjectId,
      ref: 'PointPrimaryClassification',
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
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

PointSecondaryClassificationSchema.index({ organizationId: 1, primaryClassificationId: 1 });
PointSecondaryClassificationSchema.index({ primaryClassificationId: 1, order: 1 });

let PointSecondaryClassification: Model<IPointSecondaryClassification>;

if (mongoose.models.PointSecondaryClassification) {
  PointSecondaryClassification = mongoose.models.PointSecondaryClassification as Model<IPointSecondaryClassification>;
} else {
  PointSecondaryClassification = mongoose.model<IPointSecondaryClassification>(
    'PointSecondaryClassification',
    PointSecondaryClassificationSchema
  );
}

export default PointSecondaryClassification;
