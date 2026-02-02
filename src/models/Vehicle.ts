import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVehicle extends Document {
  branchId: mongoose.Types.ObjectId;
  name: string;
  plateNumber?: string;
  imei: string;
  atharObjectId?: string;
  driverId?: mongoose.Types.ObjectId;
  routeId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      trim: true,
      default: null,
    },
    imei: {
      type: String,
      required: true,
      trim: true,
    },
    atharObjectId: {
      type: String,
      trim: true,
      default: null,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
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

VehicleSchema.index({ branchId: 1, imei: 1 }, { unique: true });
VehicleSchema.index({ branchId: 1, name: 1 });

let Vehicle: Model<IVehicle>;

if (mongoose.models.Vehicle) {
  Vehicle = mongoose.models.Vehicle;
} else {
  Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
}

export default Vehicle;
