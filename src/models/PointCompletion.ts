import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPointCompletion extends Document {
  branchId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  /** Date only (YYYY-MM-DD) in branch timezone */
  completionDate: string;
  pointVisitId: mongoose.Types.ObjectId;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PointCompletionSchema: Schema = new Schema(
  {
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
    completionDate: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pointVisitId: {
      type: Schema.Types.ObjectId,
      ref: 'PointVisit',
      required: true,
    },
    completedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

PointCompletionSchema.index({ branchId: 1, pointId: 1, completionDate: 1 }, { unique: true });

let PointCompletion: Model<IPointCompletion>;

if (mongoose.models.PointCompletion) {
  PointCompletion = mongoose.models.PointCompletion;
} else {
  PointCompletion = mongoose.model<IPointCompletion>('PointCompletion', PointCompletionSchema);
}

export default PointCompletion;
