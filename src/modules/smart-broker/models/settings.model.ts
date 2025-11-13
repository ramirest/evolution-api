import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interface para Configurações de Integrações
 */
export interface IntegrationSettings {
  ai: {
    enabled: boolean;
    provider: 'openai' | 'google' | 'anthropic';
    model: string;
    apiKey: string;
    features: {
      chat: boolean;
      analysis: boolean;
      recommendations: boolean;
      automation: boolean;
    };
  };
  email: {
    enabled: boolean;
    provider: 'smtp' | 'sendgrid' | 'ses';
    from: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    apiKey?: string;
  };
  sms: {
    enabled: boolean;
    provider: 'twilio' | 'nexmo';
    from: string;
    accountSid?: string;
    authToken?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  analytics: {
    enabled: boolean;
    provider: 'google' | 'mixpanel';
    trackingId?: string;
    apiKey?: string;
  };
  upload: {
    enabled: boolean;
    provider: 's3' | 'cloudinary' | 'gcs' | 'cloudflare';
    maxSizeBytes: number;
    allowedMimeTypes: string[];
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    cloudinary?: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    };
    googleCloud?: {
      bucket: string;
      projectId: string;
      keyFilename: string;
    };
    cloudflare?: {
      accountId: string;
      apiToken: string;
    };
  };
}

export interface ISettings extends Document {
  agencyId: mongoose.Types.ObjectId;
  integrations: IntegrationSettings;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      unique: true,
      index: true,
    },
    integrations: {
      ai: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['openai', 'google', 'anthropic'],
          default: 'openai',
        },
        model: { type: String, default: 'gpt-4o-mini' },
        apiKey: { type: String, default: '' },
        features: {
          chat: { type: Boolean, default: true },
          analysis: { type: Boolean, default: true },
          recommendations: { type: Boolean, default: true },
          automation: { type: Boolean, default: false },
        },
      },
      email: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['smtp', 'sendgrid', 'ses'],
          default: 'smtp',
        },
        from: { type: String, default: '' },
        smtpHost: { type: String },
        smtpPort: { type: Number },
        smtpUser: { type: String },
        smtpPass: { type: String },
        apiKey: { type: String },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['twilio', 'nexmo'],
          default: 'twilio',
        },
        from: { type: String, default: '' },
        accountSid: { type: String },
        authToken: { type: String },
        apiKey: { type: String },
        apiSecret: { type: String },
      },
      analytics: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['google', 'mixpanel'],
          default: 'google',
        },
        trackingId: { type: String },
        apiKey: { type: String },
      },
      upload: {
        enabled: { type: Boolean, default: false },
        provider: {
          type: String,
          enum: ['s3', 'cloudinary', 'gcs', 'cloudflare'],
          default: 'cloudinary',
        },
        maxSizeBytes: { type: Number, default: 10485760 }, // 10MB
        allowedMimeTypes: {
          type: [String],
          default: ['image/jpeg', 'image/png', 'image/webp'],
        },
        s3: {
          bucket: { type: String },
          region: { type: String },
          accessKeyId: { type: String },
          secretAccessKey: { type: String },
        },
        cloudinary: {
          cloudName: { type: String },
          apiKey: { type: String },
          apiSecret: { type: String },
        },
        googleCloud: {
          bucket: { type: String },
          projectId: { type: String },
          keyFilename: { type: String },
        },
        cloudflare: {
          accountId: { type: String },
          apiToken: { type: String },
        },
      },
    },
  },
  {
    timestamps: true,
    collection: 'settings',
  },
);

// Indexes
SettingsSchema.index({ agencyId: 1 });

export const SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);
