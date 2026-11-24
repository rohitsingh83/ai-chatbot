import { z } from 'zod';

export const CATEGORIES = ['casual', 'professional', 'creative', 'coding'];

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const preferencesSchema = z
  .object({
    botName: z.string().trim().min(1).max(40),
    theme: z.enum(['light', 'dark', 'system']),
    accent: z.enum(['violet', 'blue', 'emerald', 'rose', 'amber']),
    defaultCategory: z.enum(CATEGORIES),
    language: z.string().trim().min(1).max(40),
    responseLength: z.enum(['concise', 'balanced', 'detailed']),
    sendOnEnter: z.boolean(),
    customInstructions: z.string().trim().max(1500, 'Custom instructions can be up to 1,500 characters'),
  })
  .partial()
  .strict();

export const profileSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    preferences: preferencesSchema.optional(),
  })
  .strict();

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: signupSchema.shape.password,
});

export const createConversationSchema = z.object({
  title: z.string().trim().max(120).optional(),
  category: z.enum(CATEGORIES).optional(),
});

export const updateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    category: z.enum(CATEGORIES),
    pinned: z.boolean(),
  })
  .partial()
  .strict();

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_CHARS = 30000;

export const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().max(120).default('text/plain'),
  size: z.number().int().nonnegative().max(20 * 1024 * 1024).default(0),
  text: z.string().max(MAX_ATTACHMENT_CHARS + 200, 'Attached file is too long'),
});

export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(8000, 'Message is too long (8,000 characters max)').default(''),
    attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS, `You can attach up to ${MAX_ATTACHMENTS} files`).default([]),
  })
  .refine((v) => v.content.length > 0 || v.attachments.length > 0, { message: 'Message cannot be empty', path: ['content'] });

export const rateSchema = z.object({
  rating: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  feedback: z.string().trim().max(1000).optional(),
});

export const translateSchema = z.object({ language: z.string().trim().min(2).max(40) });

export const roleSchema = z.object({ role: z.enum(['user', 'admin']) });
