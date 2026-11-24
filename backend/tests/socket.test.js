import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import request from 'supertest';
import { io as Client } from 'socket.io-client';
import { app, signup } from './helpers.js';
import { attachSocket } from '../src/sockets/chatSocket.js';
import { setProvider } from '../src/services/aiService.js';
import { demoProvider } from '../src/services/providers/demo.js';

const server = http.createServer(app);
const io = attachSocket(server);
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}`;
after(() => {
  io.close();
  server.close();
});

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = Client(url, { auth: { token }, transports: ['websocket'], forceNew: true });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });

test('rejects sockets without a valid token', async () => {
  await assert.rejects(connect('bad-token'), /expired|Unauthorized/i);
});

test('streams a reply in real time and syncs across tabs', async () => {
  setProvider(demoProvider());
  const { token } = await signup(request);
  const tab1 = await connect(token);
  const tab2 = await connect(token);

  const tokens = [];
  const events = [];
  tab2.on('chat:token', ({ token: t }) => tokens.push(t));
  tab2.on('chat:conversation', () => events.push('conversation'));
  const done = new Promise((r) => tab2.on('chat:done', r));

  const ack = await tab1.emitWithAck('chat:send', { content: 'hello', clientId: 'c1' });
  assert.equal(ack.ok, true);
  const final = await done;
  assert.ok(tokens.length > 5, 'reply arrives in many chunks');
  assert.equal(tokens.join(''), final.message.content);
  assert.ok(events.includes('conversation'), 'new chat announced to other tabs');

  const regen = new Promise((r) => tab1.on('chat:done', r));
  const ack2 = await tab1.emitWithAck('chat:regenerate', { conversationId: ack.conversationId });
  assert.equal(ack2.ok, true);
  await regen;
  const conv = await request(app).get(`/api/conversations/${ack.conversationId}`).set({ Authorization: `Bearer ${token}` });
  assert.equal(conv.body.messages.length, 2, 'regenerate replaces the last reply');

  const bad = await tab1.emitWithAck('chat:send', { content: '' });
  assert.equal(bad.ok, false);
  tab1.close();
  tab2.close();
});
