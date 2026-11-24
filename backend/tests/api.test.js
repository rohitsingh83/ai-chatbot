import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, store, signup } from './helpers.js';

describe('auth', () => {
  before(async () => store._reset());

  test('first user becomes admin, later users do not', async () => {
    const a = await signup(request);
    const b = await signup(request);
    assert.equal(a.user.role, 'admin');
    assert.equal(b.user.role, 'user');
    assert.ok(a.token);
    assert.equal(a.user.passwordHash, undefined, 'never leak the hash');
  });

  test('rejects weak passwords and bad emails', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'X Y', email: 'nope', password: 'short' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.length >= 1);
  });

  test('rejects duplicate email', async () => {
    await signup(request, { email: 'dup@example.com' });
    const res = await request(app).post('/api/auth/signup').send({ name: 'Dup', email: 'DUP@example.com', password: 'Password123' });
    assert.equal(res.status, 409);
  });

  test('login works and wrong password fails with a generic message', async () => {
    const { user, password } = await signup(request);
    const ok = await request(app).post('/api/auth/login').send({ email: user.email, password });
    assert.equal(ok.status, 200);
    const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong12345' });
    assert.equal(bad.status, 401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'Wrong12345' });
    assert.equal(unknown.body.error, bad.body.error);
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer junk')).status, 401);
  });

  test('preferences update and validate', async () => {
    const { token } = await signup(request);
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ preferences: { botName: 'Jarvis', theme: 'dark' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.preferences.botName, 'Jarvis');
    assert.equal(res.body.user.preferences.accent, 'violet', 'other prefs kept');
    const bad = await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ preferences: { theme: 'neon' } });
    assert.equal(bad.status, 400);
    const sneaky = await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ role: 'admin' });
    assert.equal(sneaky.status, 400, 'role cannot be self-assigned');
  });

  test('change password', async () => {
    const { token, user } = await signup(request);
    const auth = { Authorization: `Bearer ${token}` };
    assert.equal((await request(app).post('/api/auth/me/password').set(auth).send({ currentPassword: 'nope', newPassword: 'NewPass123' })).status, 400);
    assert.equal((await request(app).post('/api/auth/me/password').set(auth).send({ currentPassword: 'Password123', newPassword: 'NewPass123' })).status, 200);
    assert.equal((await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPass123' })).status, 200);
  });
});

describe('conversations and messages', () => {
  test('full chat flow over REST', async () => {
    const { token } = await signup(request);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post('/api/conversations').set(auth).send({ category: 'coding' });
    assert.equal(created.status, 201);
    const id = created.body.conversation.id;

    const sent = await request(app).post(`/api/conversations/${id}/messages`).set(auth).send({ content: 'write a python function' });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.message.role, 'assistant');
    assert.match(sent.body.message.content, /```python/);
    assert.equal(sent.body.conversation.title, 'Write a python function');
    assert.equal(sent.body.conversation.messageCount, 2);

    const full = await request(app).get(`/api/conversations/${id}`).set(auth);
    assert.equal(full.body.messages.length, 2);

    const rated = await request(app)
      .patch(`/api/conversations/${id}/messages/${sent.body.message.id}/rating`)
      .set(auth)
      .send({ rating: 1, feedback: 'Nice' });
    assert.equal(rated.body.message.rating, 1);

    const userMsg = full.body.messages[0];
    const rateUser = await request(app).patch(`/api/conversations/${id}/messages/${userMsg.id}/rating`).set(auth).send({ rating: 1 });
    assert.equal(rateUser.status, 403);

    const exported = await request(app).get(`/api/conversations/${id}/export`).set(auth);
    assert.match(exported.text, /^# Write a python function/);

    const renamed = await request(app).patch(`/api/conversations/${id}`).set(auth).send({ title: 'Renamed', pinned: true });
    assert.equal(renamed.body.conversation.pinned, true);

    const search = await request(app).get('/api/conversations?search=python').set(auth);
    assert.equal(search.body.conversations.length, 1, 'search matches message content');

    assert.equal((await request(app).delete(`/api/conversations/${id}`).set(auth)).status, 204);
    assert.equal((await request(app).get(`/api/conversations/${id}`).set(auth)).status, 404);
  });

  test('users cannot read each other\'s chats', async () => {
    const a = await signup(request);
    const b = await signup(request);
    const conv = await request(app).post('/api/conversations').set({ Authorization: `Bearer ${a.token}` }).send({});
    const res = await request(app).get(`/api/conversations/${conv.body.conversation.id}`).set({ Authorization: `Bearer ${b.token}` });
    assert.equal(res.status, 403);
  });

  test('rejects empty and oversized messages', async () => {
    const { token } = await signup(request);
    const auth = { Authorization: `Bearer ${token}` };
    const conv = await request(app).post('/api/conversations').set(auth).send({});
    const id = conv.body.conversation.id;
    assert.equal((await request(app).post(`/api/conversations/${id}/messages`).set(auth).send({ content: '   ' })).status, 400);
    assert.equal((await request(app).post(`/api/conversations/${id}/messages`).set(auth).send({ content: 'x'.repeat(8001) })).status, 400);
  });
});

describe('admin', () => {
  test('stats and users are admin-only', async () => {
    await store._reset();
    const admin = await signup(request);
    const user = await signup(request);
    assert.equal((await request(app).get('/api/admin/stats').set({ Authorization: `Bearer ${user.token}` })).status, 403);
    const res = await request(app).get('/api/admin/stats').set({ Authorization: `Bearer ${admin.token}` });
    assert.equal(res.status, 200);
    assert.equal(res.body.totals.users, 2);
    assert.equal(res.body.daily.length, 14);
    assert.ok(Array.isArray(res.body.recentActivity));
    assert.equal(res.body.system.provider, 'demo');

    const promoted = await request(app)
      .patch(`/api/admin/users/${user.user.id}/role`)
      .set({ Authorization: `Bearer ${admin.token}` })
      .send({ role: 'admin' });
    assert.equal(promoted.body.user.role, 'admin');
    const self = await request(app)
      .patch(`/api/admin/users/${admin.user.id}/role`)
      .set({ Authorization: `Bearer ${admin.token}` })
      .send({ role: 'user' });
    assert.equal(self.status, 400);
  });
});

test('health and 404', async () => {
  assert.equal((await request(app).get('/api/health')).body.status, 'ok');
  assert.equal((await request(app).get('/api/nope')).status, 404);
});

describe('sessions, custom instructions and translation', () => {
  test('changing password signs out other sessions', async () => {
    const { token, user, password } = await signup(request);
    const second = (await request(app).post('/api/auth/login').send({ email: user.email, password })).body.token;
    const res = await request(app)
      .post('/api/auth/me/password')
      .set({ Authorization: `Bearer ${token}` })
      .send({ currentPassword: password, newPassword: 'Another123' });
    assert.ok(res.body.token, 'this device gets a fresh token');
    assert.equal((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${second}` })).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` })).status, 200);
  });

  test('log out of all devices', async () => {
    const { token } = await signup(request);
    const res = await request(app).post('/api/auth/logout-all').set({ Authorization: `Bearer ${token}` });
    assert.equal((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${token}` })).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${res.body.token}` })).status, 200);
  });

  test('custom instructions are saved and length-limited', async () => {
    const { token } = await signup(request);
    const auth = { Authorization: `Bearer ${token}` };
    const ok = await request(app).patch('/api/auth/me').set(auth).send({ preferences: { customInstructions: 'I am a CS student. Use simple words.' } });
    assert.equal(ok.body.user.preferences.customInstructions, 'I am a CS student. Use simple words.');
    const long = await request(app).patch('/api/auth/me').set(auth).send({ preferences: { customInstructions: 'x'.repeat(1501) } });
    assert.equal(long.status, 400);
  });

  test('translate a reply', async () => {
    const { token } = await signup(request);
    const auth = { Authorization: `Bearer ${token}` };
    const conv = await request(app).post('/api/conversations').set(auth).send({});
    const id = conv.body.conversation.id;
    const sent = await request(app).post(`/api/conversations/${id}/messages`).set(auth).send({ content: 'hello' });
    const tr = await request(app).post(`/api/conversations/${id}/messages/${sent.body.message.id}/translate`).set(auth).send({ language: 'Hindi' });
    assert.equal(tr.status, 200);
    assert.equal(tr.body.language, 'Hindi');
    assert.ok(tr.body.translation.length > 0);
    const other = await signup(request);
    const denied = await request(app)
      .post(`/api/conversations/${id}/messages/${sent.body.message.id}/translate`)
      .set({ Authorization: `Bearer ${other.token}` })
      .send({ language: 'Hindi' });
    assert.equal(denied.status, 403);
  });
});
