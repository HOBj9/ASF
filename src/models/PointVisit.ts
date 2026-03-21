import mongoose, { Schema, Document, Model } from 'mongoose';

export type VisitStatus = 'open' | 'closed';

export type VisitKind = 'first' | 'repeated';

export interface IPointVisit extends Document {
  branchId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  zoneId?: string;
  entryEventId?: mongoose.Types.ObjectId;
  exitEventId?: mongoose.Types.ObjectId;
  entryTime: Date;
  exitTime?: Date;
  durationSeconds?: number;
  status: VisitStatus;
  /** First completion of the point for that day, or repeated visit */
  visitKind?: VisitKind;
  createdAt: Date;
  updatedAt: Date;
}

const PointVisitSchema: Schema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      required: true,
      index: true,
    },
    zoneId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    entryEventId: {
      type: Schema.Types.ObjectId,
      ref: 'ZoneEvent',
      default: null,
    },
    exitEventId: {
      type: Schema.Types.ObjectId,
      ref: 'ZoneEvent',
      default: null,
    },
    entryTime: {
      type: Date,
      required: true,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    visitKind: {
      type: String,
      enum: ['first', 'repeated'],
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PointVisitSchema.index({ branchId: 1, vehicleId: 1, pointId: 1, entryTime: 1 });
PointVisitSchema.index({ branchId: 1, status: 1 });
PointVisitSchema.index({ branchId: 1, entryTime: -1 });
PointVisitSchema.index({ branchId: 1, vehicleId: 1, entryTime: -1 });

let PointVisit: Model<IPointVisit>;

if (mongoose.models.PointVisit) {
  PointVisit = mongoose.models.PointVisit;
} else {
  PointVisit = mongoose.model<IPointVisit>('PointVisit', PointVisitSchema);
}

export default PointVisit;
