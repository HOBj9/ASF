import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGovernorate extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const GovernorateSchema: Schema = new Schema(
  {
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

GovernorateSchema.index({ organizationId: 1, name: 1 });
GovernorateSchema.index({ organizationId: 1, order: 1 });

let Governorate: Model<IGovernorate>;

if (mongoose.models.Governorate) {
  Governorate = mongoose.models.Governorate as Model<IGovernorate>;
} else {
  Governorate = mongoose.model<IGovernorate>('Governorate', GovernorateSchema);
}

export default Governorate;
