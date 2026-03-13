import mongoose, { Schema, Document, Model } from 'mongoose';
// Ensure RouteZone and WorkSchedule are registered for populate ref
import './RouteZone';
import './WorkSchedule';

export interface IRoute extends Document {
  branchId: mongoose.Types.ObjectId;
  zoneIds?: mongoose.Types.ObjectId[];
  workScheduleId?: mongoose.Types.ObjectId | null;
  name: string;
  description?: string;
  color?: string;
  path?: {
    type: 'LineString';
    coordinates: number[][];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema: Schema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    zoneIds: {
      type: [Schema.Types.ObjectId],
      ref: 'RouteZone',
      default: [],
    },
    workScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkSchedule',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    color: {
      type: String,
      trim: true,
      default: '#16a34a',
    },
    path: {
      type: {
        type: String,
        enum: ['LineString'],
        default: null,
      },
      coordinates: {
        type: [[Number]],
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

RouteSchema.index({ branchId: 1, name: 1 });

let Route: Model<IRoute>;

if (mongoose.models.Route) {
  Route = mongoose.models.Route;
} else {
  Route = mongoose.model<IRoute>('Route', RouteSchema);
}

export default Route;
