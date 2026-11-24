import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, signup } from './helpers.js';
import { calculate } from '../src/services/tools/calculator.js';
import { assertPublicUrl } from '../src/services/tools/net.js';
import { runTool, describeTool } from '../src/services/tools/index.js';
import { withAttachments } from '../src/services/aiService.js';

const sse = (...events) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n';

test('calculator handles precedence, percent and functions without eval', () => {
  assert.equal(calculate('17*23'), 391);
  assert.equal(calculate('18% * 1250'), 225);
  assert.equal(calculate('10 % 3'), 1);
  assert.equal(calculate('-2^2'), -4);
  assert.equal(calculate('2^3^2'), 512);
  assert.equal(calculate('sqrt(144) + max(1, 5)'), 17);
  assert.throws(() => calculate('process.exit()'));
  assert.throws(() => calculate('1/0'));
});

test('web tools refuse private and non-http addresses', async () => {
  for (const url of ['http://localhost:4000', 'http://127.0.0.1', 'http://10.0.0.5/x', 'http://169.254.169.254/latest', 'file:///etc/passwd', 'http://[::1]/']) {
    await assert.rejects(assertPublicUrl(url), url);
  }
  const r = await runTool('read_webpage', { url: 'http://192.168.1.1' });
  assert.match(r.error, /Private/);
});

test('tool labels read naturally', () => {
  assert.equal(describeTool('web_search', { query: 'monsoon' }), 'Searching the web for “monsoon”');
  assert.equal(describeTool('read_webpage', { url: 'https://www.example.com/a' }), 'Reading example.com');
});

test('OpenAI-compatible provider runs a tool loop and streams the final answer', async () => {
  const { openaiProvider } = await import('../src/services/providers/openai.js');
  const realFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    if (bodies.length === 1) {
      return new Response(
        sse(
          { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'calculate', arguments: '{"expres' } }] } }] },
          { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'sion":"6*7"}' } }] }, finish_reason: 'tool_calls' }] },
        ),
        { status: 200 },
      );
    }
    return new Response(sse({ choices: [{ delta: { content: 'It is 42.' } }] }), { status: 200 });
  };
  try {
    const p = openaiProvider({ apiKey: 'k', model: 'm', maxTokens: 50, baseUrl: 'https://example.test/v1' });
    const toolkit = {
      definitions: [{ type: 'function', function: { name: 'calculate', parameters: {} } }],
      run: async (name, args) => ({ result: name === 'calculate' && args.expression === '6*7' ? 42 : null }),
      describe: (name, args) => `${name} ${args.expression}`,
    };
    const events = [];
    let text = '';
    for await (const t of p.stream({ system: 's', messages: [{ role: 'user', content: 'six times seven?' }], toolkit })) {
      if (typeof t === 'string') text += t;
      else events.push(t);
    }
    assert.equal(text, 'It is 42.');
    assert.deepEqual(events.map((e) => e.type), ['tool', 'tool_result']);
    assert.equal(events[0].label, 'calculate 6*7');
    assert.ok(bodies[0].tools, 'tools offered');
    const toolMsg = bodies[1].messages.find((m) => m.role === 'tool');
    assert.equal(toolMsg.tool_call_id, 'c1');
    assert.equal(JSON.parse(toolMsg.content).result, 42);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('provider answers without tools when a model rejects them', async () => {
  const { openaiProvider } = await import('../src/services/providers/openai.js');
  const realFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    sent.push(!!body.tools);
    if (body.tools) return new Response('{"error":{"message":"tools not supported"}}', { status: 400 });
    return new Response(sse({ choices: [{ delta: { content: 'plain' } }] }), { status: 200 });
  };
  try {
    const p = openaiProvider({ apiKey: 'k', model: 'm', maxTokens: 50, baseUrl: 'https://example.test/v1' });
    const toolkit = { definitions: [{}], run: async () => ({}), describe: () => '' };
    let out = '';
    for await (const t of p.stream({ system: 's', messages: [{ role: 'user', content: 'hi' }], toolkit })) out += t;
    assert.equal(out, 'plain');
    assert.deepEqual(sent, [true, false]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('attached files are placed in front of the message for the AI', () => {
  const c = withAttachments({ content: 'Summarise this', attachments: [{ name: 'notes.txt', type: 'text/plain', text: 'Hello world' }] });
  assert.match(c, /<attached_file name="notes.txt"[^>]*>\nHello world\n<\/attached_file>/);
  assert.ok(c.endsWith('Summarise this'));
});

test('file extract endpoint reads text files and rejects binaries', async () => {
  const { token } = await signup(request);
  const ok = await request(app)
    .post('/api/files/extract?name=data.csv')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'text/csv')
    .send('name,score\nAsha,91\n');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.text, 'name,score\nAsha,91');
  const bin = await request(app)
    .post('/api/files/extract?name=photo.png')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'image/png')
    .send(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 1, 2, 3]));
  assert.equal(bin.status, 400);
  assert.equal((await request(app).post('/api/files/extract').send('x')).status, 401);
});

test('messages can carry attachments over REST', async () => {
  const { token } = await signup(request);
  const auth = { Authorization: `Bearer ${token}` };
  const conv = await request(app).post('/api/conversations').set(auth).send({});
  const res = await request(app)
    .post(`/api/conversations/${conv.body.conversation.id}/messages`)
    .set(auth)
    .send({ content: '', attachments: [{ name: 'todo.md', type: 'text/markdown', size: 12, text: '- buy milk' }] });
  assert.equal(res.status, 201);
  const full = await request(app).get(`/api/conversations/${conv.body.conversation.id}`).set(auth);
  const userMsg = full.body.messages.find((m) => m.role === 'user');
  assert.equal(userMsg.attachments[0].name, 'todo.md');
  assert.equal(full.body.conversation.title, 'Todo.md');
  const empty = await request(app).post(`/api/conversations/${conv.body.conversation.id}/messages`).set(auth).send({ content: '' });
  assert.equal(empty.status, 400);
});

function makePdf(text) {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

test('file extract endpoint reads text from a PDF', async () => {
  const { token } = await signup(request);
  const res = await request(app)
    .post('/api/files/extract?name=report.pdf')
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/pdf')
    .send(makePdf('Quarterly revenue grew 12 percent'));
  assert.equal(res.status, 200);
  assert.equal(res.body.pages, 1);
  assert.match(res.body.text, /Quarterly revenue grew 12 percent/);
});
