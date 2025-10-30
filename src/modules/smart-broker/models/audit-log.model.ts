import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXECUTE = 'EXECUTE',
  SEND = 'SEND',
}

export enum AuditResource {
  USER = 'User',
  AGENCY = 'Agency',
  PROPERTY = 'Property',
  CONTACT = 'Contact',
  CAMPAIGN = 'Campaign',
  MESSAGE = 'Message',
  AUTHENTICATION = 'Authentication',
}

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  userEmail: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: Types.ObjectId;
  resourceName?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  isSuccess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    action: { type: String, enum: Object.values(AuditAction), required: true },
    resource: { type: String, enum: Object.values(AuditResource), required: true },
    resourceId: { type: Schema.Types.ObjectId },
    resourceName: String,
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed },
    },
    metadata: { type: Object },
    ip: String,
    userAgent: String,
    method: String,
    endpoint: String,
    statusCode: Number,
    duration: Number,
    error: String,
    isSuccess: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Índices
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, resource: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resourceId: 1 });
AuditLogSchema.index({ isSuccess: 1 });

// TTL index para deletar logs antigos automaticamente (90 dias)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
