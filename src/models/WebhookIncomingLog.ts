import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWebhookIncomingLog extends Document {
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookIncomingLogSchema: Schema = new Schema(
  {
    method: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    query: {
      type: Schema.Types.Mixed,
      default: {},
    },
    body: {
      type: Schema.Types.Mixed,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

WebhookIncomingLogSchema.index({ receivedAt: -1 });

let WebhookIncomingLog: Model<IWebhookIncomingLog>;

if (mongoose.models.WebhookIncomingLog) {
  WebhookIncomingLog = mongoose.models.WebhookIncomingLog as Model<IWebhookIncomingLog>;
} else {
  WebhookIncomingLog = mongoose.model<IWebhookIncomingLog>('WebhookIncomingLog', WebhookIncomingLogSchema);
}

export default WebhookIncomingLog;
