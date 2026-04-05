import mongoose, { Document, Model, Schema } from 'mongoose';
import {
  trackingEventDefinitionScopes,
  trackingEventDefinitionSyncStatuses,
  zoneEventProviders,
  type TrackingEventDefinitionScope,
  type TrackingEventDefinitionSyncStatus,
  type ZoneEventProvider,
} from '@/lib/tracking/types';

export type TrackingEventType = 'zone_in' | 'zone_out';

export interface ITrackingEventDefinition extends Document {
  branchId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId | null;
  vehicleId: mongoose.Types.ObjectId;
  pointId: mongoose.Types.ObjectId;
  zoneIdSnapshot?: string | null;
  providerTarget: ZoneEventProvider;
  eventType: TrackingEventType;
  isActive: boolean;
  externalEventId?: string | null;
  externalSyncStatus: TrackingEventDefinitionSyncStatus;
  externalSyncError?: string | null;
  lastSyncedAt?: Date | null;
  createdByUserId?: mongoose.Types.ObjectId | null;
  updatedByUserId?: mongoose.Types.ObjectId | null;
  createdByScope: TrackingEventDefinitionScope;
  updatedByScope: TrackingEventDefinitionScope;
  createdAt: Date;
  updatedAt: Date;
}

const TrackingEventDefinitionSchema = new Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    pointId: {
      type: Schema.Types.ObjectId,
      ref: 'Point',
      required: true,
      index: true,
    },
    zoneIdSnapshot: {
      type: String,
      trim: true,
      default: null,
    },
    providerTarget: {
      type: String,
      enum: zoneEventProviders,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['zone_in', 'zone_out'],
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    externalEventId: {
      type: String,
      trim: true,
      default: null,
    },
    externalSyncStatus: {
      type: String,
      enum: trackingEventDefinitionSyncStatuses,
      default: 'pending',
      index: true,
    },
    externalSyncError: {
      type: String,
      trim: true,
      default: null,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdByScope: {
      type: String,
      enum: trackingEventDefinitionScopes,
      default: 'branch',
    },
    updatedByScope: {
      type: String,
      enum: trackingEventDefinitionScopes,
      default: 'branch',
    },
  },
  {
    timestamps: true,
  }
);

TrackingEventDefinitionSchema.index(
  { branchId: 1, vehicleId: 1, pointId: 1, providerTarget: 1, eventType: 1 },
  { unique: true }
);
TrackingEventDefinitionSchema.index({ branchId: 1, providerTarget: 1, isActive: 1 });
TrackingEventDefinitionSchema.index({ branchId: 1, vehicleId: 1, providerTarget: 1, isActive: 1 });
TrackingEventDefinitionSchema.index({ branchId: 1, pointId: 1, providerTarget: 1, isActive: 1 });

TrackingEventDefinitionSchema.pre('validate', function (next) {
  if (this.providerTarget === 'mobile_app') {
    this.externalSyncStatus = 'not_required';
  } else if (!this.externalSyncStatus || this.externalSyncStatus === 'not_required') {
    this.externalSyncStatus = this.isActive ? 'pending' : 'pending';
  }

  next();
});

let TrackingEventDefinition: Model<ITrackingEventDefinition>;

if (mongoose.models.TrackingEventDefinition) {
  TrackingEventDefinition =
    mongoose.models.TrackingEventDefinition as Model<ITrackingEventDefinition>;
} else {
  TrackingEventDefinition = mongoose.model<ITrackingEventDefinition>(
    'TrackingEventDefinition',
    TrackingEventDefinitionSchema
  );
}

export default TrackingEventDefinition;



