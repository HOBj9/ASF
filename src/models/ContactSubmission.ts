import mongoose, { Document, Model, Schema } from 'mongoose';

export type ContactInquiryType = 'web_inquiry' | 'project_inquiry' | 'other';
export type ContactSubmissionStatus = 'new' | 'reviewed' | 'archived';

export interface IContactSubmission extends Document {
  name: string;
  email: string;
  inquiryType: ContactInquiryType;
  expectedDailyMessages: string;
  message: string;
  status: ContactSubmissionStatus;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    inquiryType: {
      type: String,
      enum: ['web_inquiry', 'project_inquiry', 'other'],
      required: true,
      default: 'web_inquiry',
      index: true,
    },
    expectedDailyMessages: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'archived'],
      default: 'new',
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ContactSubmissionSchema.index({ createdAt: -1 });

const ContactSubmission =
  (mongoose.models.ContactSubmission as Model<IContactSubmission>) ||
  mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);

export default ContactSubmission;
