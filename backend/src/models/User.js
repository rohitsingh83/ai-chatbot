import mongoose from 'mongoose';

const preferencesSchema = new mongoose.Schema(
  {
    botName: { type: String, default: 'Nova', maxlength: 40 },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    accent: { type: String, enum: ['violet', 'blue', 'emerald', 'rose', 'amber'], default: 'violet' },
    defaultCategory: {
      type: String,
      enum: ['casual', 'professional', 'creative', 'coding'],
      default: 'casual',
    },
    language: { type: String, default: 'auto', maxlength: 40 },
    responseLength: { type: String, enum: ['concise', 'balanced', 'detailed'], default: 'balanced' },
    sendOnEnter: { type: Boolean, default: true },
    // Personal "custom AI tuning": extra instructions added to every system prompt.
    customInstructions: { type: String, maxlength: 1500, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    preferences: { type: preferencesSchema, default: () => ({}) },
    lastActiveAt: { type: Date, default: Date.now },
    // Bumped to revoke every issued JWT (password change, "log out everywhere").
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
