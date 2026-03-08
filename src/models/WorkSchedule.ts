import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWorkScheduleDay {
  dayOfWeek: number; // 0=الأحد, 1=الإثنين, 2=الثلاثاء, 3=الأربعاء, 4=الخميس, 5=الجمعة, 6=السبت
  startTime: string; // "08:00"
  endTime: string; // "16:00"
}

export interface IWorkSchedule extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId | null;
  sourceWorkScheduleId?: mongoose.Types.ObjectId | null;
  name: string;
  nameAr?: string | null;
  order: number;
  days: IWorkScheduleDay[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkScheduleDaySchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const WorkScheduleSchema: Schema = new Schema(
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
    sourceWorkScheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkSchedule',
      default: null,
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
    days: {
      type: [WorkScheduleDaySchema],
      default: [],
    },
  },
  { timestamps: true }
);

WorkScheduleSchema.index({ organizationId: 1, order: 1 });
WorkScheduleSchema.index({ branchId: 1, order: 1 });

let WorkSchedule: Model<IWorkSchedule>;

if (mongoose.models.WorkSchedule) {
  WorkSchedule = mongoose.models.WorkSchedule as Model<IWorkSchedule>;
} else {
  WorkSchedule = mongoose.model<IWorkSchedule>('WorkSchedule', WorkScheduleSchema);
}

export default WorkSchedule;
