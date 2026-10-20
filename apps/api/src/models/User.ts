import { Schema, model, type InferSchemaType } from 'mongoose';

// A website account: a customer who signed up, or the client's admin login.
// Accounts are created by the register endpoint (issue #16), never by hand,
// because passwords must be stored as bcrypt hashes.
const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false }, // hidden from queries unless asked for
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: false }, // login is blocked until true

    // Email verification and password reset links (issue #16)
    verificationToken: { type: String, select: false },
    verificationTokenExpires: Date,
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: Date,

    // Saved drinks, if the client approves favorites (issue #1)
    favorites: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }],
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);