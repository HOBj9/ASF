import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRouteScheduleVehicle extends Document {
  routeId: mongoose.Types.ObjectId;
  workScheduleId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RouteScheduleVehicleSchema: Schema = new Schema(
  {
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    workScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkSchedule',
      required: true,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

RouteScheduleVehicleSchema.index({ routeId: 1, workScheduleId: 1, vehicleId: 1 }, { unique: true });

let RouteScheduleVehicle: Model<IRouteScheduleVehicle>;

if (mongoose.models.RouteScheduleVehicle) {
  RouteScheduleVehicle = mongoose.models.RouteScheduleVehicle as Model<IRouteScheduleVehicle>;
} else {
  RouteScheduleVehicle = mongoose.model<IRouteScheduleVehicle>('RouteScheduleVehicle', RouteScheduleVehicleSchema);
}

export default RouteScheduleVehicle;
