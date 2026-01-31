import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoutePoint extends Document {
  routeId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoutePointSchema: Schema = new Schema(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      required: true,
      index: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

RoutePointSchema.index({ routeId: 1, order: 1 }, { unique: true });
RoutePointSchema.index({ routeId: 1, pointId: 1 });

let RoutePoint: Model<IRoutePoint>;

if (mongoose.models.RoutePoint) {
  RoutePoint = mongoose.models.RoutePoint;
} else {
  RoutePoint = mongoose.model<IRoutePoint>('RoutePoint', RoutePointSchema);
}

export default RoutePoint;
