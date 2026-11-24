import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.js';
import { generateReply, setProvider, buildSystemPrompt, makeTitle, cacheStats } from '../src/services/aiService.js';

const fake = (chunks, { fail } = {}) => {
  let calls = 0;
  return {
    name: 'fake',
    model: 'fake-1',
    get calls() {
      return calls;
    },
    async *stream() {
      calls++;
      if (fail && calls <= fail.times) throw Object.assign(new Error('boom'), { retryable: fail.retryable });
      for (const c of chunks) yield c;
    },
  };
};

test('streams tokens and caches repeated first-turn questions', async () => {
  const p = fake(['Hel', 'lo']);
  setProvider(p);
  const tokens = [];
  const r1 = await generateReply({ history: [{ role: 'user', content: 'Hi there' }], onToken: (t) => tokens.push(t) });
  assert.equal(r1.text, 'Hello');
  assert.deepEqual(tokens, ['Hel', 'lo']);
  assert.equal(r1.cached, false);
  const hitsBefore = cacheStats.hits;
  const r2 = await generateReply({ history: [{ role: 'user', content: '  hi   THERE ' }] });
  assert.equal(r2.cached, true);
  assert.equal(r2.text, 'Hello');
  assert.equal(cacheStats.hits, hitsBefore + 1);
  assert.equal(p.calls, 1);
});

test('does not cache multi-turn conversations', async () => {
  const p = fake(['ok']);
  setProvider(p);
  const history = [
    { role: 'user', content: 'a' },
    { role: 'assistant', content: 'b' },
    { role: 'user', content: 'c' },
  ];
  await generateReply({ history });
  await generateReply({ history });
  assert.equal(p.calls, 2);
});

test('retries once on a retryable error, not on others', async () => {
  const flaky = fake(['fine'], { fail: { times: 1, retryable: true } });
  setProvider(flaky);
  const r = await generateReply({ history: [{ role: 'user', content: 'retry me' }] });
  assert.equal(r.text, 'fine');
  assert.equal(flaky.calls, 2);

  const broken = fake(['x'], { fail: { times: 5, retryable: false } });
  setProvider(broken);
  await assert.rejects(generateReply({ history: [{ role: 'user', content: 'no retry' }] }), /boom/);
  assert.equal(broken.calls, 1);
});

test('stop keeps the partial answer', async () => {
  const ac = new AbortController();
  setProvider({
    name: 'slow',
    model: 's',
    async *stream({ signal }) {
      yield 'partial';
      ac.abort();
      if (signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      yield 'never';
    },
  });
  const r = await generateReply({ history: [{ role: 'user', content: 'stop test' }], signal: ac.signal });
  assert.equal(r.text, 'partial');
  assert.equal(r.stopped, true);
});

test('system prompt reflects personalisation', () => {
  const s = buildSystemPrompt({ botName: 'Jarvis', category: 'coding', language: 'Hindi', responseLength: 'concise' });
  assert.match(s, /You are Jarvis/);
  assert.match(s, /senior software engineer/);
  assert.match(s, /reply in Hindi/i);
  assert.match(s, /short/);
});

test('titles are short and clean', () => {
  assert.equal(makeTitle('**how** do i center a div in css please help me now'), 'How do i center a div in');
  assert.equal(makeTitle('   '), 'New chat');
});

test('custom instructions reach the system prompt', () => {
  const s = buildSystemPrompt({ customInstructions: 'Always answer like a pirate' });
  assert.match(s, /<custom_instructions>\nAlways answer like a pirate\n<\/custom_instructions>/);
  assert.doesNotMatch(buildSystemPrompt({}), /custom_instructions/);
});
