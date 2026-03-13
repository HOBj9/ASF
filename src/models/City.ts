import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICity extends Document {
  governorateId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema: Schema = new Schema(
  {
    governorateId: {
      type: Schema.Types.ObjectId,
      ref: 'Governorate',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
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

CitySchema.index({ governorateId: 1, name: 1 });
CitySchema.index({ organizationId: 1, governorateId: 1 });
CitySchema.index({ organizationId: 1, order: 1 });

let City: Model<ICity>;

if (mongoose.models.City) {
  City = mongoose.models.City as Model<ICity>;
} else {
  City = mongoose.model<ICity>('City', CitySchema);
}

export default City;
