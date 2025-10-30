import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface IAgencySettings {
  autoResponse?: boolean;
  workingHours?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
}

export interface IAgency extends Document {
  name: string;
  cnpj: string;
  description?: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  address?: IAddress;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  isActive: boolean;
  maxInstances: number;
  settings?: IAgencySettings;
  creci?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    street: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Brasil' },
  },
  { _id: false }
);

const AgencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    description: String,
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: String,
    logo: String,
    address: AddressSchema,
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    maxInstances: { type: Number, default: 1, min: 0 },
    settings: { type: Object },
    creci: String,
  },
  {
    timestamps: true,
  }
);

// Índices
AgencySchema.index({ owner: 1 });
AgencySchema.index({ email: 1 });
AgencySchema.index({ cnpj: 1 });

export const AgencyModel = mongoose.model<IAgency>('Agency', AgencySchema);
