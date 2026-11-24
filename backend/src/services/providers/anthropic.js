import { readSSE, providerError } from './sse.js';

/** Claude via the Anthropic Messages API, streamed. */
export function anthropicProvider({ apiKey, model, maxTokens }) {
  return {
    name: 'anthropic',
    model,
    async *stream({ system, messages, signal }) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages, stream: true }),
      });
      if (!res.ok) throw await providerError(res, 'Anthropic');
      for await (const { data } of readSSE(res.body)) {
        let evt;
        try {
          evt = JSON.parse(data);
        } catch {
          continue;
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') yield evt.delta.text;
        else if (evt.type === 'error') throw new Error(evt.error?.message || 'Anthropic stream error');
      }
    },
  };
}
