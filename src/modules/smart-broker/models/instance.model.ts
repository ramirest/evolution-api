import { Schema, model, Document } from 'mongoose';

/**
 * Interface para o documento Instance no MongoDB
 * Mapeia instâncias WhatsApp para agências (RBAC)
 */
export interface IInstance extends Document {
  instanceName: string;
  agencyId: string;
  createdBy: string;
  webhookUrl?: string;
  status?: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const InstanceSchema = new Schema<IInstance>(
  {
    instanceName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    agencyId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'instances',
  }
);

// Índice composto para queries otimizadas
InstanceSchema.index({ agencyId: 1, status: 1 });

export const Instance = model<IInstance>('Instance', InstanceSchema);
