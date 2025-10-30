import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CampaignType {
  BROADCAST = 'broadcast',
  DRIP = 'drip',
  TARGETED = 'targeted',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

export interface ICampaign extends Document {
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: {
    targetAgency?: Types.ObjectId;
    targetStatus?: string[];
    targetTags?: string[];
    targetOrigin?: string[];
    specificContacts?: Types.ObjectId[];
  };
  message: {
    template: string;
    variables?: Map<string, string>;
    mediaUrl?: string;
    mediaType?: MediaType;
  };
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    frequency?: string;
    timeOfDay?: string;
    sendImmediately: boolean;
    lastExecutionDate?: Date;
  };
  evolutionInstanceId: string;
  statistics: {
    totalContacts: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
  };
  createdBy: Types.ObjectId;
  agency?: Types.ObjectId;
  isActive: boolean;
  lastExecutionDate?: Date;
  nextExecutionDate?: Date;
  rateLimitMs: number;
  maxRetries: number;
  respectBusinessHours: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  excludedWeekdays?: string[];
  templateId?: Types.ObjectId;
  tags?: string[];
  metadata?: Map<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: Object.values(CampaignType), required: true },
    status: { type: String, enum: Object.values(CampaignStatus), default: CampaignStatus.DRAFT },
    audience: {
      targetAgency: { type: Schema.Types.ObjectId, ref: 'Agency' },
      targetStatus: [String],
      targetTags: [String],
      targetOrigin: [String],
      specificContacts: [{ type: Schema.Types.ObjectId, ref: 'Contact' }],
    },
    message: {
      template: { type: String, required: true },
      variables: { type: Map, of: String },
      mediaUrl: String,
      mediaType: { type: String, enum: Object.values(MediaType) },
    },
    schedule: {
      startDate: Date,
      endDate: Date,
      frequency: String,
      timeOfDay: String,
      sendImmediately: { type: Boolean, default: false },
      lastExecutionDate: Date,
    },
    evolutionInstanceId: { type: String, required: true },
    statistics: {
      totalContacts: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    agency: { type: Schema.Types.ObjectId, ref: 'Agency' },
    isActive: { type: Boolean, default: true },
    lastExecutionDate: Date,
    nextExecutionDate: Date,
    rateLimitMs: { type: Number, default: 1000 },
    maxRetries: { type: Number, default: 3 },
    respectBusinessHours: { type: Boolean, default: false },
    businessHoursStart: String,
    businessHoursEnd: String,
    excludedWeekdays: [String],
    templateId: { type: Schema.Types.ObjectId, ref: 'Template' },
    tags: [String],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Índices
CampaignSchema.index({ agency: 1, status: 1 });
CampaignSchema.index({ createdBy: 1 });
CampaignSchema.index({ type: 1, status: 1 });
CampaignSchema.index({ nextExecutionDate: 1, status: 1 });
CampaignSchema.index({ isActive: 1 });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema);
