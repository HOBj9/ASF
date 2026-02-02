import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  nameAr: string;
  permissions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
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
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
  },
  {
    timestamps: true,
  }
);

let Role: Model<IRole>;

if (mongoose.models.Role) {
  Role = mongoose.models.Role;
} else {
  Role = mongoose.model<IRole>('Role', RoleSchema);
}

export default Role;

