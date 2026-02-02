import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDriver extends Document {
  branchId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  nationalId?: string;
  assignedVehicleId?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema(
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
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    nationalId: {
      type: String,
      trim: true,
      default: null,
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
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

DriverSchema.index({ branchId: 1, name: 1 });

let Driver: Model<IDriver>;

if (mongoose.models.Driver) {
  Driver = mongoose.models.Driver;
} else {
  Driver = mongoose.model<IDriver>('Driver', DriverSchema);
}

export default Driver;
