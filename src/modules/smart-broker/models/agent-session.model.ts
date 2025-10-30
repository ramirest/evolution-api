import mongoose, { Schema, Document } from 'mongoose';

export enum SessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  ERROR = 'error',
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IAgentSession extends Document {
  userId: string;
  agencyId: string;
  agentType: string;
  title: string | null;
  status: SessionStatus;
  agentStatus: AgentStatus;
  context: Record<string, any>;
  messages: IMessage[];
  lastMessageAt: Date | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Object },
  },
  { _id: false }
);

const AgentSessionSchema = new Schema<IAgentSession>(
  {
    userId: { type: String, required: true, index: true },
    agencyId: { type: String, required: true, index: true },
    agentType: { type: String, required: true, index: true },
    title: { type: String, default: null },
    status: { type: String, enum: Object.values(SessionStatus), default: SessionStatus.ACTIVE },
    agentStatus: { type: String, enum: Object.values(AgentStatus), default: AgentStatus.IDLE },
    context: { type: Object, default: {} },
    messages: [MessageSchema],
    lastMessageAt: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Índices compostos
AgentSessionSchema.index({ userId: 1, createdAt: -1 });
AgentSessionSchema.index({ agencyId: 1, status: 1 });
AgentSessionSchema.index({ agentType: 1, status: 1 });

export const AgentSessionModel = mongoose.model<IAgentSession>('AgentSession', AgentSessionSchema);
