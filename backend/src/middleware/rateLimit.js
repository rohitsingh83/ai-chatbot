import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const handler = (_req, res) =>
  res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });

const skip = () => env.isTest;

export const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, handler, skip });

export const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, handler, skip });

export const messageLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.rateLimit.messagesPerMinute,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  skip,
});

/** Sliding-window limiter for socket events (express-rate-limit is HTTP only). */
export function createSocketLimiter({ limit = env.rateLimit.messagesPerMinute, windowMs = 60_000 } = {}) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return { ok: false, retryInMs: windowMs - (now - recent[0]) };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true };
  };
}
