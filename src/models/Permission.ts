import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  nameAr: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    nameAr: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'read', 'update', 'delete', 'manage'],
    },
  },
  {
    timestamps: true,
  }
);

let Permission: Model<IPermission>;

if (mongoose.models.Permission) {
  Permission = mongoose.models.Permission;
} else {
  Permission = mongoose.model<IPermission>('Permission', PermissionSchema);
}

export default Permission;

