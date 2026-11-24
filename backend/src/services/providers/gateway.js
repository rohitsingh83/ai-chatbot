import { openaiProvider } from './openai.js';
import { demoProvider } from './demo.js';
import { logger } from '../../utils/logger.js';

/**
 * Vercel AI Gateway: one OpenAI-compatible endpoint for Claude, GPT, Gemini and more.
 * Authenticates with AI_GATEWAY_API_KEY, or, when deployed on Vercel, with the
 * project's OIDC token (no API key needed).
 */
let oidcToken = process.env.VERCEL_OIDC_TOKEN || '';

/** Vercel sends a fresh OIDC token with every request; remember the latest one. */
export function rememberOidcToken(headers) {
  const t = headers?.['x-vercel-oidc-token'];
  if (typeof t === 'string' && t) oidcToken = t;
}

export function gatewayToken() {
  return process.env.AI_GATEWAY_API_KEY || oidcToken;
}

export function gatewayProvider({ model, fallbackModels = [], maxTokens }) {
  const models = [model, ...fallbackModels.filter((m) => m && m !== model)];
  const clients = new Map(
    models.map((m) => [
      m,
      openaiProvider({
        name: 'gateway',
        label: 'AI Gateway',
        model: m,
        maxTokens,
        baseUrl: 'https://ai-gateway.vercel.sh/v1',
        getApiKey: gatewayToken,
      }),
    ]),
  );
  // Models the team cannot use yet (e.g. paid models before credits are added)
  // are skipped for a while, then retried, so upgrading needs no redeploy.
  const blockedUntil = new Map();
  const demo = demoProvider();
  let active = model;

  return {
    name: 'gateway',
    supportsTools: true,
    get model() {
      return active;
    },
    async *stream(args) {
      if (!gatewayToken()) {
        yield* demo.stream(args);
        return;
      }
      let lastRateLimit = null;
      let current = args;
      for (const m of models) {
        if ((blockedUntil.get(m) || 0) > Date.now()) continue;
        // Up to two attempts per model: a reasoning model can return an empty reply.
        for (let attempt = 0; attempt < 2; attempt++) {
          let started = false;
          try {
            for await (const chunk of clients.get(m).stream(current)) {
              started = true;
              active = m;
              yield chunk;
            }
            active = m;
            return;
          } catch (err) {
            if (!started && err.empty) {
              logger.warn(`AI Gateway model ${m}: ${err.message}`);
              continue;
            }
            if (err.status === 429 && (!started || err.convo)) {
              if (err.convo) current = { ...current, messages: err.convo };
              // Free-tier models have small per-minute limits: try the next model.
              logger.warn(`AI Gateway model ${m} rate limited: ${err.message}`);
              lastRateLimit = err;
              blockedUntil.set(m, Date.now() + 30 * 1000);
              break;
            }
            if (!started && [401, 402, 403].includes(err.status)) {
              logger.warn(`AI Gateway model ${m} unavailable: ${err.message}`);
              blockedUntil.set(m, Date.now() + 10 * 60 * 1000);
              break;
            }
            throw err;
          }
        }
      }
      // Every model is busy: report the rate limit so the user can retry shortly.
      if (lastRateLimit) throw lastRateLimit;
      // Nothing usable on the gateway: keep the app working with the demo model.
      logger.warn('AI Gateway has no usable model, using the demo model');
      yield* demo.stream(args);
    },
  };
}
