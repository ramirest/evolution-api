import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Enums para o módulo de Upload
 */
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

export enum ResourceType {
  PROPERTY = 'property',
  USER = 'user',
  AGENCY = 'agency',
  CONTACT = 'contact',
  CAMPAIGN = 'campaign',
  MESSAGE = 'message',
}

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  CLOUDINARY = 'cloudinary',
  GOOGLE_CLOUD = 'google_cloud',
  CLOUDFLARE = 'cloudflare',
}

/**
 * Interface para documentos File
 */
export interface IFile extends Document {
  _id: Types.ObjectId;
  originalName: string;
  filename: string;
  path: string;
  url?: string;
  mimetype: string;
  size: number;
  type: FileType;
  resourceType?: ResourceType;
  resourceId?: Types.ObjectId;
  provider: StorageProvider;
  uploadedBy: Types.ObjectId;
  agencyId?: Types.ObjectId;
  isPublic: boolean;
  metadata?: Record<string, any>;
  s3Key?: string;
  s3Bucket?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema Mongoose para File
 */
const FileSchema = new Schema<IFile>(
  {
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    path: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(FileType),
      required: true,
    },
    resourceType: {
      type: String,
      enum: Object.values(ResourceType),
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    provider: {
      type: String,
      enum: Object.values(StorageProvider),
      default: StorageProvider.LOCAL,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    s3Key: {
      type: String,
    },
    s3Bucket: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para otimização de queries
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ resourceType: 1, resourceId: 1 });
FileSchema.index({ agencyId: 1, type: 1 });
FileSchema.index({ isDeleted: 1 });
FileSchema.index({ filename: 1 }, { unique: true });

/**
 * Model do Mongoose
 */
export const FileModel = mongoose.model<IFile>('File', FileSchema);
