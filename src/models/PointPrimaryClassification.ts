import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointPrimaryClassification extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  name: string;
  nameAr?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const PointPrimaryClassificationSchema: Schema = new Schema(
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

PointPrimaryClassificationSchema.index({ organizationId: 1, branchId: 1 });
PointPrimaryClassificationSchema.index({ organizationId: 1, order: 1 });

let PointPrimaryClassification: Model<IPointPrimaryClassification>;

if (mongoose.models.PointPrimaryClassification) {
  PointPrimaryClassification = mongoose.models.PointPrimaryClassification as Model<IPointPrimaryClassification>;
} else {
  PointPrimaryClassification = mongoose.model<IPointPrimaryClassification>(
    'PointPrimaryClassification',
    PointPrimaryClassificationSchema
  );
}

export default PointPrimaryClassification;
