import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMunicipality extends Document {
  name: string;
  nameAr?: string;
  governorate: string;
  areaName?: string;
  addressText?: string;
  centerLat: number;
  centerLng: number;
  timezone: string;
  atharKey?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MunicipalitySchema: Schema = new Schema(
  {
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
    governorate: {
      type: String,
      required: true,
      trim: true,
    },
    areaName: {
      type: String,
      trim: true,
      default: null,
    },
    addressText: {
      type: String,
      trim: true,
      default: null,
    },
    centerLat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    centerLng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    timezone: {
      type: String,
      default: 'Asia/Damascus',
    },
    atharKey: {
      type: String,
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

MunicipalitySchema.index({ name: 1, governorate: 1 });

let Municipality: Model<IMunicipality>;

if (mongoose.models.Municipality) {
  Municipality = mongoose.models.Municipality;
} else {
  Municipality = mongoose.model<IMunicipality>('Municipality', MunicipalitySchema);
}

export default Municipality;
