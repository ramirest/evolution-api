import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  VIEWER = 'viewer',
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone?: string;
  avatar?: string;
  agencyId?: string | null;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    avatar: { type: String },
    agencyId: { type: String, default: null },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.AGENT,
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Índices
UserSchema.index({ email: 1 });
UserSchema.index({ agencyId: 1 });
UserSchema.index({ role: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
