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
    // "anthropic" | "openai" | "gateway" (Vercel AI Gateway) | "demo"; auto-detected from keys when unset.
    provider:
      process.env.AI_PROVIDER ||
      (process.env.ANTHROPIC_API_KEY
        ? 'anthropic'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : process.env.AI_GATEWAY_API_KEY
            ? 'gateway'
            : 'demo'),
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    openaiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    gatewayModel: process.env.AI_GATEWAY_MODEL || 'anthropic/claude-haiku-5.5',
    // Tried in order when the main model is not available on the team's plan (e.g. AI Gateway free tier).
    gatewayFallbackModels: list(process.env.AI_GATEWAY_FALLBACK_MODELS || 'nvidia/nemotron-3.5-lightning-free,reflection/beam-free'),
    maxTokens: Number(process.env.AI_MAX_TOKENS) || 1024,
    // Reasoning models on the gateway think before answering, so they need a bigger budget.
    gatewayMaxTokens: Number(process.env.AI_GATEWAY_MAX_TOKENS) || 4096,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 90000,
    // Free tools (web search, web pages, weather, calculator, time, Wikipedia) for models that support them.
    tools: process.env.AI_TOOLS !== 'false',
    historyLimit: Number(process.env.AI_HISTORY_LIMIT) || 20,
  },
  rateLimit: {
    messagesPerMinute: Number(process.env.RATE_LIMIT_MESSAGES_PER_MIN) || 20,
  },
};

if (isProd && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}
