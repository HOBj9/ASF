import crypto from 'crypto';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUserApiKey extends Document {
  userId: mongoose.Types.ObjectId;
  keyHash: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserApiKeySchema = new Schema<IUserApiKey>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

UserApiKeySchema.statics.hashKey = function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

const UserApiKey =
  (mongoose.models.UserApiKey as Model<IUserApiKey>) ||
  mongoose.model<IUserApiKey>('UserApiKey', UserApiKeySchema);

export default UserApiKey;
