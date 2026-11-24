import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New chat', maxlength: 120 },
    category: {
      type: String,
      enum: ['casual', 'professional', 'creative', 'coding'],
      default: 'casual',
    },
    pinned: { type: Boolean, default: false },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// The sidebar query: a user's chats, pinned first, newest activity first.
conversationSchema.index({ user: 1, pinned: -1, lastMessageAt: -1 });
conversationSchema.index({ user: 1, title: 'text' });

export const Conversation =
  mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);
