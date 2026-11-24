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

export function gatewayProvider({ model, maxTokens }) {
  const real = openaiProvider({
    name: 'gateway',
    label: 'AI Gateway',
    model,
    maxTokens,
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    getApiKey: gatewayToken,
  });
  const demo = demoProvider();
  return {
    ...real,
    // If the gateway is not usable yet (no token, or the team has not enabled
    // AI Gateway billing), keep the app working with the demo model instead of
    // showing an error. Real answers start as soon as the gateway accepts requests.
    async *stream(args) {
      if (!gatewayToken()) {
        yield* demo.stream(args);
        return;
      }
      try {
        yield* real.stream(args);
      } catch (err) {
        if ([401, 402, 403].includes(err.status)) {
          logger.warn(`AI Gateway unavailable, using the demo model: ${err.message}`);
          yield* demo.stream(args);
          return;
        }
        throw err;
      }
    },
  };
}
