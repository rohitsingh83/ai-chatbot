/** Parse a Server-Sent Events body from fetch() into { event, data } objects. */
export async function* readSSE(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, '');
      let event = 'message';
      const data = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) yield { event, data: data.join('\n') };
    }
  }
}

export async function providerError(res, name) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || JSON.stringify(j);
  } catch {
    /* ignore */
  }
  const err = new Error(`${name} API error ${res.status}${detail ? `: ${detail}` : ''}`);
  err.status = res.status;
  const retryAfter = Number(res.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = Math.min(retryAfter * 1000, 60000);
  err.retryable = res.status === 429 || res.status >= 500;
  return err;
}
