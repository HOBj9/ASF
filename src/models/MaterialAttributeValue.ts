import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMaterialAttributeValue extends Document {
  materialId: mongoose.Types.ObjectId;
  attributeId: mongoose.Types.ObjectId;
  value: any;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialAttributeValueSchema: Schema = new Schema(
  {
    materialId: {
      type: Schema.Types.ObjectId,
      ref: 'Material',
      required: true,
      index: true,
    },
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: 'MaterialAttributeDefinition',
      required: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MaterialAttributeValueSchema.index({ materialId: 1, attributeId: 1 }, { unique: true });

let MaterialAttributeValue: Model<IMaterialAttributeValue>;

if (mongoose.models.MaterialAttributeValue) {
  MaterialAttributeValue = mongoose.models.MaterialAttributeValue;
} else {
  MaterialAttributeValue = mongoose.model<IMaterialAttributeValue>(
    'MaterialAttributeValue',
    MaterialAttributeValueSchema
  );
}

export default MaterialAttributeValue;
