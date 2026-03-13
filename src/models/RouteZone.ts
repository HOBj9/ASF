import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRouteZone extends Document {
  cityId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const RouteZoneSchema: Schema = new Schema(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: 'City',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
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

RouteZoneSchema.index({ cityId: 1, branchId: 1, name: 1 });
RouteZoneSchema.index({ branchId: 1, order: 1 });
RouteZoneSchema.index({ organizationId: 1 });

let RouteZone: Model<IRouteZone>;

if (mongoose.models.RouteZone) {
  RouteZone = mongoose.models.RouteZone as Model<IRouteZone>;
} else {
  RouteZone = mongoose.model<IRouteZone>('RouteZone', RouteZoneSchema);
}

export default RouteZone;
