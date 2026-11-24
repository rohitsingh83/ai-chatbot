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
      for await (const { data } of readSSE(res.body)) {
        if (data === '[DONE]') return;
        let evt;
        try {
          evt = JSON.parse(data);
        } catch {
          continue;
        }
        const text = evt.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    },
  };
}
