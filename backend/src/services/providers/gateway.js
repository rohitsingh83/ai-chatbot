import { openaiProvider } from './openai.js';

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
  return openaiProvider({
    name: 'gateway',
    label: 'AI Gateway',
    model,
    maxTokens,
    baseUrl: 'https://ai-gateway.vercel.sh/v1',
    getApiKey: gatewayToken,
  });
}
