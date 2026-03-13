import mongoose, { Schema, Document, Model } from 'mongoose';

export type SurveyQuestionType = 'text' | 'choice' | 'current_location';

export interface ISurveyQuestion {
  type: SurveyQuestionType;
  questionText: string;
  questionTextAr?: string;
  options?: string[];
  required?: boolean;
}

export interface ISurvey extends Document {
  organizationId: mongoose.Types.ObjectId;
  /** If null/undefined: org-wide (visible to all line supervisors). If set: branch-specific. */
  branchId?: mongoose.Types.ObjectId | null;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questions: ISurveyQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SurveyQuestionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['text', 'choice', 'current_location'],
      required: true,
    },
    questionText: { type: String, required: true, trim: true },
    questionTextAr: { type: String, trim: true, default: null },
    options: { type: [String], default: undefined },
    required: { type: Boolean, default: false },
  },
  { _id: true }
);

const SurveySchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    titleAr: { type: String, trim: true, default: null },
    description: { type: String, trim: true, default: null },
    descriptionAr: { type: String, trim: true, default: null },
    questions: {
      type: [SurveyQuestionSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SurveySchema.index({ organizationId: 1, isActive: 1 });
SurveySchema.index({ organizationId: 1, branchId: 1, isActive: 1 });

let Survey: Model<ISurvey>;

if (mongoose.models.Survey) {
  Survey = mongoose.models.Survey as Model<ISurvey>;
} else {
  Survey = mongoose.model<ISurvey>('Survey', SurveySchema);
}

export default Survey;
