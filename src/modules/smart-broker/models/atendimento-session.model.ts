import { Schema, model, Document, Types } from 'mongoose';

/**
 * ATENDIMENTO SESSION MODEL
 * 
 * Representa uma sessão de atendimento entre um cliente (via WhatsApp) e a plataforma.
 * A sessão pode ser atendida por IA ou por um corretor humano.
 */

export enum AtendimentoStatus {
  OPEN_BY_AGENT = 'OPEN_BY_AGENT', // Sessão sendo atendida pela IA
  PENDING_HUMAN_HANDOFF = 'PENDING_HUMAN_HANDOFF', // IA solicitou transferência, aguardando corretor
  IN_PROGRESS_BY_HUMAN = 'IN_PROGRESS_BY_HUMAN', // Corretor humano assumiu
  CLOSED = 'CLOSED', // Sessão encerrada
}

export interface IAtendimentoMessage {
  role: 'user' | 'agent' | 'human'; // user = cliente, agent = IA, human = corretor
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: any[]; // Ferramentas chamadas pela IA
    handoffReason?: string; // Motivo da transferência
  };
}

export interface IAtendimentoSession extends Document {
  _id: Types.ObjectId;
  chatId: string; // Telefone do cliente (WhatsApp)
  contactId?: Types.ObjectId; // ID do contato (se já cadastrado)
  agencyId: Types.ObjectId; // Agência responsável (identificada pelo número da instância)
  instanceName: string; // Nome da instância do Evolution API
  status: AtendimentoStatus;
  messages: IAtendimentoMessage[];
  assignedTo?: Types.ObjectId; // ID do corretor que assumiu (se IN_PROGRESS_BY_HUMAN)
  handoffReason?: string; // Motivo da transferência para humano
  metadata: {
    clientName?: string;
    clientEmail?: string;
    leadQualification?: {
      budget?: number;
      location?: string;
      propertyType?: string;
      bedrooms?: number;
    };
    visitScheduled?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

const AtendimentoSessionSchema = new Schema<IAtendimentoSession>(
  {
    chatId: {
      type: String,
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    instanceName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AtendimentoStatus),
      default: AtendimentoStatus.OPEN_BY_AGENT,
      index: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'agent', 'human'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    handoffReason: String,
    metadata: {
      clientName: String,
      clientEmail: String,
      leadQualification: {
        budget: Number,
        location: String,
        propertyType: String,
        bedrooms: Number,
      },
      visitScheduled: Boolean,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Índice composto para buscas eficientes
AtendimentoSessionSchema.index({ agencyId: 1, status: 1, lastMessageAt: -1 });
AtendimentoSessionSchema.index({ chatId: 1, agencyId: 1 }, { unique: true });

export const AtendimentoSessionModel = model<IAtendimentoSession>(
  'AtendimentoSession',
  AtendimentoSessionSchema,
);
