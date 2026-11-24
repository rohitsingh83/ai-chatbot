import { readSSE, providerError } from './sse.js';

/** OpenAI (or any OpenAI-compatible endpoint, e.g. Groq, OpenRouter, Ollama) via Chat Completions. */
export function openaiProvider({ apiKey, getApiKey, model, maxTokens, baseUrl, name = 'openai', label = 'OpenAI' }) {
  return {
    name,
    model,
    async *stream({ system, messages, signal }) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${getApiKey ? getApiKey() : apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      });
      if (!res.ok) throw await providerError(res, label);
      let produced = false;
      let finish = '';
      let reasoningChars = 0;
      for await (const { data } of readSSE(res.body)) {
        if (data === '[DONE]') break;
        let evt;
        try {
          evt = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = evt.choices?.[0];
        if (choice?.finish_reason) finish = choice.finish_reason;
        const delta = choice?.delta || {};
        reasoningChars += (delta.reasoning || delta.reasoning_content || '').length;
        if (delta.content) {
          produced = true;
          yield delta.content;
        }
      }
      if (!produced && !signal?.aborted) {
        // Some reasoning models occasionally spend the whole budget thinking.
        const err = new Error(`${label} returned an empty reply (finish: ${finish || 'none'}, reasoning chars: ${reasoningChars})`);
        err.empty = true;
        throw err;
      }
    },
  };
}
