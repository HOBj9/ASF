import mongoose, { Schema, Document, Model } from 'mongoose';

export type MaterialAttributeType = 'text' | 'number' | 'select' | 'boolean' | 'date';

export interface IMaterialAttributeDefinition extends Document {
  categoryId: mongoose.Types.ObjectId;
  originAttributeId?: mongoose.Types.ObjectId | null;
  name: string;
  type: MaterialAttributeType;
  required: boolean;
  options?: string[];
  unitId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  isOverride?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialAttributeDefinitionSchema: Schema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialCategory',
      required: true,
      index: true,
    },
    originAttributeId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialAttributeDefinition',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'boolean', 'date'],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: [],
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOverride: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

MaterialAttributeDefinitionSchema.index({ categoryId: 1, name: 1 }, { unique: true });

let MaterialAttributeDefinition: Model<IMaterialAttributeDefinition>;

if (mongoose.models.MaterialAttributeDefinition) {
  MaterialAttributeDefinition = mongoose.models.MaterialAttributeDefinition;
} else {
  MaterialAttributeDefinition = mongoose.model<IMaterialAttributeDefinition>(
    'MaterialAttributeDefinition',
    MaterialAttributeDefinitionSchema
  );
}

export default MaterialAttributeDefinition;
