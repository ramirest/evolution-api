import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TemplateCategory {
  WELCOME = 'welcome',
  PROPERTY_VIEWING = 'property_viewing',
  PROPERTY_DETAILS = 'property_details',
  FOLLOW_UP = 'follow_up',
  APPOINTMENT = 'appointment',
  GENERAL = 'general',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  CUSTOM = 'custom',
}

export enum TemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export interface ITemplate extends Document {
  name: string;
  description?: string;
  content: string;
  variables: Array<{
    name: string;
    description?: string;
    required: boolean;
    defaultValue?: string;
    type?: 'text' | 'number' | 'date' | 'url';
  }>;
  category: TemplateCategory;
  status: TemplateStatus;
  tags: string[];
  agency: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  currentVersion: number;
  versions: any[];
  usageCount: number;
  lastUsedAt?: Date;
  isShared: boolean;
  isSystem: boolean;
  attachments?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    content: { type: String, required: true },
    variables: [{ type: Object }],
    category: { type: String, enum: Object.values(TemplateCategory), default: TemplateCategory.GENERAL },
    status: { type: String, enum: Object.values(TemplateStatus), default: TemplateStatus.DRAFT },
    tags: [String],
    agency: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    currentVersion: { type: Number, default: 1 },
    versions: [{ type: Object }],
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    isShared: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    attachments: [String],
    metadata: { type: Object },
  },
  { timestamps: true }
);

// Índices
TemplateSchema.index({ agency: 1, status: 1 });
TemplateSchema.index({ agency: 1, category: 1 });
TemplateSchema.index({ createdAt: -1 });

export const TemplateModel = mongoose.model<ITemplate>('Template', TemplateSchema);
