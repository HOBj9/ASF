import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoute extends Document {
  municipalityId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
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
    municipalityId: {
      type: Schema.Types.ObjectId,
      ref: 'Municipality',
      required: true,
      index: true,
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

RouteSchema.index({ municipalityId: 1, name: 1 });

let Route: Model<IRoute>;

if (mongoose.models.Route) {
  Route = mongoose.models.Route;
} else {
  Route = mongoose.model<IRoute>('Route', RouteSchema);
}

export default Route;
