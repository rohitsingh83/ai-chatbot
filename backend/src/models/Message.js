import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, default: '' },
    // Feedback on assistant replies: 1 = helpful, -1 = not helpful, 0 = unrated.
    rating: { type: Number, enum: [-1, 0, 1], default: 0 },
    feedback: { type: String, maxlength: 1000, default: '' },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
    latencyMs: { type: Number, default: 0 },
    cached: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ role: 1, rating: 1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
