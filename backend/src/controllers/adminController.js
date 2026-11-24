import { getStore } from '../store/index.js';
import { getProvider, cacheStats } from '../services/aiService.js';
import { badRequest, notFound } from '../utils/errors.js';
import { publicUser } from '../store/defaults.js';
import { onlineCount } from '../sockets/presence.js';

export async function stats(req, res) {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 7), 90);
  const data = await getStore().analytics.stats({ days });
  const p = getProvider();
  res.json({
    ...data,
    system: {
      provider: p.name,
      model: p.model,
      storage: getStore().kind,
      onlineUsers: onlineCount(),
      cache: cacheStats,
      uptimeSec: Math.round(process.uptime()),
    },
  });
}

export async function users(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
  const list = await getStore().users.list({ search, limit: 100 });
  res.json({ users: list.map(publicUser) });
}

export async function setRole(req, res) {
  if (req.params.id === req.user.id) throw badRequest("You can't change your own role");
  const user = await getStore().users.update(req.params.id, { role: req.body.role });
  if (!user) throw notFound('User not found');
  res.json({ user: publicUser(user) });
}
