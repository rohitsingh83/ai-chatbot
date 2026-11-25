import { readSSE, providerError } from './sse.js';

const MAX_TOOL_ROUNDS = 4;

/**
 * OpenAI (or any OpenAI-compatible endpoint, e.g. Groq, OpenRouter, Ollama, Vercel AI Gateway)
 * via Chat Completions, with optional tool calling.
 *
 * stream() yields strings (answer text) and, when tools are used, event objects:
 *   { type: 'tool', id, name, args, label }       the model started a tool
 *   { type: 'tool_result', id, name, ok, error }   the tool finished
 */
export function openaiProvider({ apiKey, getApiKey, model, maxTokens, baseUrl, name = 'openai', label = 'OpenAI' }) {
  // Models that rejected the `tools` parameter: answer without tools from then on.
  let toolsUnsupported = false;

  async function request({ system, messages, signal, tools }) {
    const body = {
      model,
      max_tokens: maxTokens,
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    };
    if (tools) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    return fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${getApiKey ? getApiKey() : apiKey}` },
      body: JSON.stringify(body),
    });
  }

  return {
    name,
    model,
    supportsTools: true,
    async *stream({ system, messages, signal, toolkit }) {
      const convo = [...messages];
      let producedAny = false;

      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        // On the last round, ask for a plain answer so the loop always ends.
        const offerTools = toolkit && !toolsUnsupported && round < MAX_TOOL_ROUNDS ? toolkit.definitions : null;
        let res = await request({ system, messages: convo, signal, tools: offerTools });
        if (!res.ok && offerTools && res.status === 400) {
          // Some models do not support function calling: carry on without tools.
          toolsUnsupported = true;
          res = await request({ system, messages: convo, signal, tools: null });
        }
        if (!res.ok) {
          const err = await providerError(res, label);
          // Mid-way through a tool loop: hand back the conversation so far, so a
          // fallback model can finish the answer without redoing the tools.
          if (round > 0) err.convo = convo;
          throw err;
        }

        let content = '';
        let finish = '';
        let reasoningChars = 0;
        const calls = []; // accumulated tool calls, by index
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
          for (const tc of delta.tool_calls || []) {
            const i = tc.index ?? calls.length;
            calls[i] ||= { id: '', name: '', args: '' };
            if (tc.id) calls[i].id = tc.id;
            if (tc.function?.name) calls[i].name += tc.function.name;
            if (tc.function?.arguments) calls[i].args += tc.function.arguments;
          }
          if (delta.content) {
            content += delta.content;
            producedAny = true;
            yield delta.content;
          }
        }

        const toolCalls = calls.filter((c) => c?.name);
        if (!toolCalls.length || !toolkit) {
          if (!producedAny && !signal?.aborted) {
            // Some reasoning models occasionally spend the whole budget thinking.
            const err = new Error(`${label} returned an empty reply (finish: ${finish || 'none'}, reasoning chars: ${reasoningChars})`);
            err.empty = true;
            throw err;
          }
          return;
        }

        // Run the requested tools, then give the results back to the model.
        producedAny = true;
        if (content && !/\s$/.test(content)) yield '\n\n';
        convo.push({
          role: 'assistant',
          content: content || null,
          tool_calls: toolCalls.map((c, i) => ({
            id: c.id || `call_${round}_${i}`,
            type: 'function',
            function: { name: c.name, arguments: c.args || '{}' },
          })),
        });
        for (const [i, c] of toolCalls.entries()) {
          const id = c.id || `call_${round}_${i}`;
          let args = {};
          try {
            args = c.args ? JSON.parse(c.args) : {};
          } catch {
            args = {};
          }
          yield { type: 'tool', id, name: c.name, args, label: toolkit.describe(c.name, args) };
          const result = await toolkit.run(c.name, args, { signal });
          yield { type: 'tool_result', id, name: c.name, ok: !result?.error, error: result?.error };
          let out = JSON.stringify(result);
          if (out.length > 16000) out = `${out.slice(0, 16000)}…(truncated)`;
          convo.push({ role: 'tool', tool_call_id: id, content: out });
        }
        if (signal?.aborted) return;
      }
    },
  };
}
