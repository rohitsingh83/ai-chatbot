/**
 * Zero-config storage used when MONGODB_URI is not set (local demo, tests).
 * Same interface as mongoStore.js. Data is kept in memory and, outside tests,
 * persisted to a JSON file so it survives restarts.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { defaultPreferences, lastDays, DAY } from './defaults.js';

const newId = () => crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();
const clone = (o) => (o ? structuredClone(o) : null);

export function createMemoryStore({ file } = {}) {
  let db = { users: [], conversations: [], messages: [] };
  if (file && fs.existsSync(file)) {
    try {
      db = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      /* start fresh on a corrupt file */
    }
  }

  let timer = null;
  const persist = () => {
    if (!file) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(db));
    }, 200);
  };

  const users = {
    async create({ name, email, passwordHash, role = 'user', preferences, createdAt = now() }) {
      const u = {
        id: newId(),
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        tokenVersion: 0,
        preferences: { ...defaultPreferences(), ...preferences },
        lastActiveAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      };
      db.users.push(u);
      persist();
      return clone(u);
    },
    async findByEmail(email) {
      return clone(db.users.find((u) => u.email === email.toLowerCase()));
    },
    async findById(id) {
      return clone(db.users.find((u) => u.id === id));
    },
    async update(id, patch) {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      if (patch.preferences) patch = { ...patch, preferences: { ...u.preferences, ...patch.preferences } };
      Object.assign(u, patch, { updatedAt: now() });
      persist();
      return clone(u);
    },
    async touch(id) {
      const u = db.users.find((x) => x.id === id);
      if (u) {
        u.lastActiveAt = now();
        persist();
      }
    },
    async count() {
      return db.users.length;
    },
    async list({ search = '', limit = 50 } = {}) {
      const q = search.toLowerCase();
      const counts = {};
      for (const m of db.messages) if (m.role === 'user') counts[m.user] = (counts[m.user] || 0) + 1;
      return db.users
        .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((u) => ({ ...clone(u), messageCount: counts[u.id] || 0 }));
    },
  };

  const conversations = {
    async create({ user, title = 'New chat', category = 'casual', pinned = false, createdAt = now() }) {
      const c = {
        id: newId(),
        user,
        title,
        category,
        pinned,
        messageCount: 0,
        lastMessageAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      };
      db.conversations.push(c);
      persist();
      return clone(c);
    },
    async findById(id) {
      return clone(db.conversations.find((c) => c.id === id));
    },
    async listByUser(user, { search = '' } = {}) {
      const q = search.toLowerCase();
      const matchingConvs = q
        ? new Set(db.messages.filter((m) => m.user === user && m.content.toLowerCase().includes(q)).map((m) => m.conversation))
        : null;
      return db.conversations
        .filter((c) => c.user === user)
        .filter((c) => !q || c.title.toLowerCase().includes(q) || matchingConvs.has(c.id))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAt.localeCompare(a.lastMessageAt))
        .map(clone);
    },
    async update(id, patch) {
      const c = db.conversations.find((x) => x.id === id);
      if (!c) return null;
      Object.assign(c, patch, { updatedAt: now() });
      persist();
      return clone(c);
    },
    async delete(id) {
      db.conversations = db.conversations.filter((c) => c.id !== id);
      db.messages = db.messages.filter((m) => m.conversation !== id);
      persist();
    },
    async deleteAllForUser(user) {
      const ids = new Set(db.conversations.filter((c) => c.user === user).map((c) => c.id));
      db.conversations = db.conversations.filter((c) => !ids.has(c.id));
      db.messages = db.messages.filter((m) => !ids.has(m.conversation));
      persist();
    },
  };

  const recount = (convId) => {
    const c = db.conversations.find((x) => x.id === convId);
    if (c) c.messageCount = db.messages.filter((m) => m.conversation === convId).length;
  };

  const messages = {
    async create(data) {
      const m = {
        id: newId(),
        rating: 0,
        feedback: '',
        provider: '',
        model: '',
        latencyMs: 0,
        cached: false,
        error: false,
        createdAt: now(),
        updatedAt: now(),
        ...data,
      };
      db.messages.push(m);
      const c = db.conversations.find((x) => x.id === data.conversation);
      if (c && m.createdAt >= c.lastMessageAt) {
        c.lastMessageAt = m.createdAt;
        c.updatedAt = m.createdAt;
      }
      recount(data.conversation);
      persist();
      return clone(m);
    },
    async findById(id) {
      return clone(db.messages.find((m) => m.id === id));
    },
    async listByConversation(conversation, { limit } = {}) {
      const all = db.messages.filter((m) => m.conversation === conversation);
      return (limit ? all.slice(-limit) : all).map(clone);
    },
    async update(id, patch) {
      const m = db.messages.find((x) => x.id === id);
      if (!m) return null;
      Object.assign(m, patch, { updatedAt: now() });
      persist();
      return clone(m);
    },
    async delete(id) {
      const m = db.messages.find((x) => x.id === id);
      db.messages = db.messages.filter((x) => x.id !== id);
      if (m) recount(m.conversation);
      persist();
    },
  };

  const analytics = {
    async stats({ days = 14 } = {}) {
      const since = Date.now() - 7 * DAY;
      const assistant = db.messages.filter((m) => m.role === 'assistant' && !m.error);
      const up = assistant.filter((m) => m.rating === 1).length;
      const down = assistant.filter((m) => m.rating === -1).length;
      const keys = lastDays(days);
      const daily = keys.map((date) => {
        const msgs = db.messages.filter((m) => m.createdAt.slice(0, 10) === date);
        return {
          date,
          messages: msgs.length,
          activeUsers: new Set(msgs.map((m) => m.user)).size,
          conversations: db.conversations.filter((c) => c.createdAt.slice(0, 10) === date).length,
        };
      });
      const categories = {};
      for (const c of db.conversations) categories[c.category] = (categories[c.category] || 0) + 1;
      const perUser = {};
      for (const m of db.messages) if (m.role === 'user') perUser[m.user] = (perUser[m.user] || 0) + 1;
      const topUsers = Object.entries(perUser)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, messagesCount]) => {
          const u = db.users.find((x) => x.id === id);
          return { id, name: u?.name || 'Deleted user', email: u?.email || '', messages: messagesCount };
        });
      const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }));
      for (const m of db.messages) hourly[new Date(m.createdAt).getUTCHours()].messages++;
      const recentFeedback = db.messages
        .filter((m) => m.role === 'assistant' && m.rating !== 0)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8)
        .map((m) => ({
          id: m.id,
          rating: m.rating,
          feedback: m.feedback,
          excerpt: m.content.slice(0, 160),
          userName: db.users.find((u) => u.id === m.user)?.name || 'Unknown',
          updatedAt: m.updatedAt,
        }));
      const recentActivity = [...db.conversations]
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
        .slice(0, 10)
        .map((c) => ({
          id: c.id,
          title: c.title,
          category: c.category,
          messageCount: c.messageCount,
          lastMessageAt: c.lastMessageAt,
          userName: db.users.find((u) => u.id === c.user)?.name || 'Deleted user',
        }));
      const latencies = assistant.filter((m) => !m.cached && m.latencyMs > 0).map((m) => m.latencyMs);
      return {
        totals: {
          users: db.users.length,
          conversations: db.conversations.length,
          messages: db.messages.length,
          activeUsers7d: db.users.filter((u) => new Date(u.lastActiveAt).getTime() >= since).length,
          avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
          satisfaction: up + down ? Math.round((up / (up + down)) * 100) : null,
          cacheHits: assistant.filter((m) => m.cached).length,
          errors: db.messages.filter((m) => m.error).length,
        },
        ratings: { up, down, unrated: assistant.length - up - down },
        daily,
        hourly,
        categories: Object.entries(categories).map(([category, count]) => ({ category, count })),
        topUsers,
        recentFeedback,
        recentActivity,
      };
    },
  };

  return {
    kind: 'memory',
    users,
    conversations,
    messages,
    analytics,
    async close() {
      clearTimeout(timer);
      if (file) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(db));
      }
    },
    /** Test helper. */
    _reset() {
      db = { users: [], conversations: [], messages: [] };
    },
  };
}
