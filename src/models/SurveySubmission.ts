import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISurveySubmission extends Document {
  surveyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  /** Set when submitter has branchId (line supervisor / branch admin) for filtering by branch. */
  branchId?: mongoose.Types.ObjectId | null;
  mapLat: number;
  mapLng: number;
  deviceLat?: number | null;
  deviceLng?: number | null;
  answers: Record<string, unknown>;
  pointId?: mongoose.Types.ObjectId | null;
  /** Set when the point has been converted to Athar (zones created). */
  convertedToAthar?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SurveySubmissionSchema: Schema = new Schema(
  {
    surveyId: {
      type: Schema.Types.ObjectId,
      ref: 'Survey',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
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
    mapLat: { type: Number, required: true },
    mapLng: { type: Number, required: true },
    deviceLat: { type: Number, default: null },
    deviceLng: { type: Number, default: null },
    answers: { type: Schema.Types.Mixed, default: {} },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      default: null,
    },
    convertedToAthar: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SurveySubmissionSchema.index({ surveyId: 1, userId: 1 });
SurveySubmissionSchema.index({ organizationId: 1, createdAt: -1 });
SurveySubmissionSchema.index({ organizationId: 1, branchId: 1, createdAt: -1 });

let SurveySubmission: Model<ISurveySubmission>;

if (mongoose.models.SurveySubmission) {
  SurveySubmission = mongoose.models.SurveySubmission as Model<ISurveySubmission>;
} else {
  SurveySubmission = mongoose.model<ISurveySubmission>('SurveySubmission', SurveySubmissionSchema);
}

export default SurveySubmission;
