import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ContactStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NEGOTIATING = 'negotiating',
  CONVERTED = 'converted',
  NOT_INTERESTED = 'not_interested',
  LOST = 'lost',
}

export enum ContactOrigin {
  WHATSAPP = 'whatsapp',
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  WALK_IN = 'walk_in',
  AI_ASSISTANT = 'AI_ASSISTANT',
  OTHER = 'other',
}

export enum InteractionType {
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  MEETING = 'meeting',
  PROPERTY_VISIT = 'property_visit',
  NOTE = 'note',
}

export interface IInteraction {
  type: InteractionType;
  description: string;
  performedBy: Types.ObjectId;
  date: Date;
  property?: Types.ObjectId;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface IContact extends Document {
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin: ContactOrigin;
  status: ContactStatus;
  interestedProperties: Types.ObjectId[];
  agency?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  interactions: IInteraction[];
  tags: string[];
  notes?: string;
  isActive: boolean;
  whatsappInstanceId?: string;
  lastContactDate?: Date;
  preferences?: {
    propertyType?: string[];
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    locations?: string[];
    bedrooms?: number;
    bathrooms?: number;
    parkingSpaces?: number;
  };
  budget?: number;
  urgency?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InteractionSchema = new Schema<IInteraction>(
  {
    type: { type: String, enum: Object.values(InteractionType), required: true },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    property: { type: Schema.Types.ObjectId, ref: 'Property' },
    duration: Number,
    metadata: { type: Object },
  },
  { _id: false }
);

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    cpf: String,
    origin: { type: String, enum: Object.values(ContactOrigin), required: true },
    status: { type: String, enum: Object.values(ContactStatus), default: ContactStatus.NEW },
    interestedProperties: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    agency: { type: Schema.Types.ObjectId, ref: 'Agency' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    interactions: [InteractionSchema],
    tags: [String],
    notes: String,
    isActive: { type: Boolean, default: true },
    whatsappInstanceId: String,
    lastContactDate: Date,
    preferences: { type: Object },
    budget: Number,
    urgency: String,
    source: String,
  },
  { timestamps: true }
);

// Índices
ContactSchema.index({ agency: 1 });
ContactSchema.index({ assignedTo: 1 });
ContactSchema.index({ status: 1 });
ContactSchema.index({ origin: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ email: 1 });
ContactSchema.index({ createdAt: -1 });
ContactSchema.index({ lastContactDate: -1 });
ContactSchema.index({ interestedProperties: 1 });

export const ContactModel = mongoose.model<IContact>('Contact', ContactSchema);
