import { HydratedDocument, Schema, model } from 'mongoose';
import { toJSONTransform } from '../utils/toJSON';

export interface UserAttributes {
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IUser = HydratedDocument<UserAttributes>;

const userSchema = new Schema<UserAttributes>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => toJSONTransform(ret, 'passwordHash'),
    },
  },
);

export const User = model<UserAttributes>('User', userSchema);
