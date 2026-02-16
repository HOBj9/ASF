import mongoose, { Schema, Document, Model } from 'mongoose';

export interface OrganizationLabels {
  branchLabel: string;
  pointLabel: string;
  vehicleLabel: string;
  driverLabel: string;
  routeLabel: string;
  lineSupervisorLabel?: string;
  surveyLabel?: string;
}

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type?: string;
  labels: OrganizationLabels;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: null,
    },
    labels: {
      branchLabel: { type: String, default: 'فرع', trim: true },
      pointLabel: { type: String, default: 'نقاط', trim: true },
      vehicleLabel: { type: String, default: 'مركبات', trim: true },
      driverLabel: { type: String, default: 'سائقين', trim: true },
      routeLabel: { type: String, default: 'مسارات', trim: true },
      lineSupervisorLabel: { type: String, default: 'مشرفو الخط', trim: true },
      surveyLabel: { type: String, default: 'الاستبيانات', trim: true },
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

OrganizationSchema.index({ name: 1 });
OrganizationSchema.index({ slug: 1 }, { unique: true });

let Organization: Model<IOrganization>;

if (mongoose.models.Organization) {
  Organization = mongoose.models.Organization;
} else {
  Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
}

export default Organization;
