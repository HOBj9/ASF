import mongoose, { Schema, Document, Model } from 'mongoose';

export type IncomingAtharEventStatus = 'processed' | 'duplicate' | 'rejected' | 'error';

export interface IIncomingAtharEvent extends Document {
  receivedAt: Date;
  sourceMethod: 'GET' | 'POST';
  sourcePath: string;
  headers?: Record<string, any> | null;
  query?: Record<string, any> | null;
  body?: Record<string, any> | null;
  rawPayload?: Record<string, any> | null;
  eventId?: string | null;
  zoneIdRaw?: string | null;
  zoneIdNormalized?: string | null;
  zoneName?: string | null;
  imei?: string | null;
  type?: string | null;
  dtServer?: string | null;
  dtTracker?: string | null;
  lat?: number | null;
  lng?: number | null;
  speed?: number | null;
  branchId?: mongoose.Types.ObjectId | null;
  zoneEventId?: mongoose.Types.ObjectId | null;
  processingStatus: IncomingAtharEventStatus;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IncomingAtharEventSchema: Schema = new Schema(
  {
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    sourceMethod: {
      type: String,
      enum: ['GET', 'POST'],
      required: true,
    },
    sourcePath: {
      type: String,
      required: true,
      trim: true,
    },
    headers: {
      type: Schema.Types.Mixed,
      default: null,
    },
    query: {
      type: Schema.Types.Mixed,
      default: null,
    },
    body: {
      type: Schema.Types.Mixed,
      default: null,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
    eventId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    zoneIdRaw: {
      type: String,
      trim: true,
      default: null,
    },
    zoneIdNormalized: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    zoneName: {
      type: String,
      trim: true,
      default: null,
    },
    imei: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    dtServer: {
      type: String,
      trim: true,
      default: null,
    },
    dtTracker: {
      type: String,
      trim: true,
      default: null,
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    zoneEventId: {
      type: Schema.Types.ObjectId,
      ref: 'ZoneEvent',
      default: null,
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['processed', 'duplicate', 'rejected', 'error'],
      default: 'error',
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

IncomingAtharEventSchema.index({ receivedAt: -1 });
IncomingAtharEventSchema.index({ eventId: 1, zoneIdNormalized: 1, type: 1 });
IncomingAtharEventSchema.index({ processingStatus: 1, receivedAt: -1 });

let IncomingAtharEvent: Model<IIncomingAtharEvent>;

if (mongoose.models.IncomingAtharEvent) {
  IncomingAtharEvent = mongoose.models.IncomingAtharEvent;
} else {
  IncomingAtharEvent = mongoose.model<IIncomingAtharEvent>('IncomingAtharEvent', IncomingAtharEventSchema);
}

export default IncomingAtharEvent;
