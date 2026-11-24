import 'dotenv/config';

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:3000'),
  adminEmails: list(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()),
  ai: {
    // "anthropic" | "openai" | "demo"; auto-detected from keys when unset.
    provider:
      process.env.AI_PROVIDER ||
      (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY ? 'openai' : 'demo'),
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    openaiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 1024,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60000,
    historyLimit: Number(process.env.AI_HISTORY_LIMIT) || 20,
  },
  rateLimit: {
    messagesPerMinute: Number(process.env.RATE_LIMIT_MESSAGES_PER_MIN) || 20,
  },
};

if (isProd && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}
