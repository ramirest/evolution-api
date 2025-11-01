import mongoose, { Schema, Document, Types } from 'mongoose';

export enum PropertyType {
  HOUSE = 'house',
  APARTMENT = 'apartment',
  COMMERCIAL = 'commercial',
  LAND = 'land',
  FARM = 'farm',
  PENTHOUSE = 'penthouse',
  STUDIO = 'studio',
}

export enum PropertyStatus {
  AVAILABLE = 'available',
  SOLD = 'sold',
  RENTED = 'rented',
  RESERVED = 'reserved',
  UNAVAILABLE = 'unavailable',
}

export enum TransactionType {
  SALE = 'sale',
  RENT = 'rent',
  BOTH = 'both',
}

export interface IProperty extends Document {
  type: PropertyType;
  transactionType: TransactionType;
  title: string;
  description: string;
  price: number;
  rentPrice?: number;
  condominiumFee?: number;
  iptu?: number;
  area: number;
  builtArea?: number;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    suites: number;
    parkingSpaces: number;
    furnished: boolean;
    pool: boolean;
    gym: boolean;
    garden: boolean;
    barbecue: boolean;
    elevator: boolean;
    airConditioning: boolean;
    security: boolean;
  };
  photos: string[];
  documents: string[];
  status: PropertyStatus;
  agency: Types.ObjectId;
  owner: Types.ObjectId;
  isActive: boolean;
  video?: string;
  virtualTour?: string;
  tags: string[];
  views: number;
  registrationNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    type: { type: String, enum: Object.values(PropertyType), required: true },
    transactionType: { type: String, enum: Object.values(TransactionType), required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    rentPrice: Number,
    condominiumFee: Number,
    iptu: Number,
    area: { type: Number, required: true },
    builtArea: Number,
    address: {
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'Brasil' },
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    features: {
      bedrooms: { type: Number, default: 0 },
      bathrooms: { type: Number, default: 0 },
      suites: { type: Number, default: 0 },
      parkingSpaces: { type: Number, default: 0 },
      furnished: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      garden: { type: Boolean, default: false },
      barbecue: { type: Boolean, default: false },
      elevator: { type: Boolean, default: false },
      airConditioning: { type: Boolean, default: false },
      security: { type: Boolean, default: false },
    },
    photos: [String],
    documents: [String],
    status: { type: String, enum: Object.values(PropertyStatus), default: PropertyStatus.AVAILABLE },
    agency: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    video: String,
    virtualTour: String,
    tags: [String],
    views: { type: Number, default: 0 },
    registrationNumber: String,
  },
  { 
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Índices
PropertySchema.index({ agency: 1 });
PropertySchema.index({ owner: 1 });
PropertySchema.index({ type: 1 });
PropertySchema.index({ status: 1 });
PropertySchema.index({ transactionType: 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ 'address.city': 1 });
PropertySchema.index({ 'address.state': 1 });
PropertySchema.index({ 'address.neighborhood': 1 });
PropertySchema.index({ createdAt: -1 });

export const PropertyModel = mongoose.model<IProperty>('Property', PropertySchema);
