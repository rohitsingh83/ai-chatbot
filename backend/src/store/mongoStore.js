/**
 * MongoDB storage (Mongoose). Used whenever MONGODB_URI is set.
 * Every method returns plain objects with string `id`s and ISO date strings,
 * matching memoryStore.js, so the rest of the app never touches Mongoose docs.
 */
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { lastDays, DAY } from './defaults.js';

const { isValidObjectId } = mongoose;

function plain(doc) {
  if (!doc) return null;
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_id') out.id = String(v);
    else if (k === '__v') continue;
    else if (v instanceof Date) out[k] = v.toISOString();
    else if (v instanceof mongoose.Types.ObjectId) out[k] = String(v);
    else out[k] = v;
  }
  return out;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function createMongoStore(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([User.syncIndexes(), Conversation.syncIndexes(), Message.syncIndexes()]);

  const users = {
    async create(data) {
      const u = await User.create(data);
      return plain(u.toObject());
    },
    async findByEmail(email) {
      return plain(await User.findOne({ email: email.toLowerCase() }).lean());
    },
    async findById(id) {
      if (!isValidObjectId(id)) return null;
      return plain(await User.findById(id).lean());
    },
    async update(id, patch) {
      if (!isValidObjectId(id)) return null;
      const $set = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'preferences') for (const [pk, pv] of Object.entries(v)) $set[`preferences.${pk}`] = pv;
        else $set[k] = v;
      }
      return plain(await User.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).lean());
    },
    async touch(id) {
      if (isValidObjectId(id)) await User.updateOne({ _id: id }, { $set: { lastActiveAt: new Date() } });
    },
    async count() {
      return User.countDocuments();
    },
    async list({ search = '', limit = 50 } = {}) {
      const filter = search
        ? { $or: [{ name: new RegExp(escapeRegex(search), 'i') }, { email: new RegExp(escapeRegex(search), 'i') }] }
        : {};
      const list = await User.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
      const counts = await Message.aggregate([
        { $match: { role: 'user', user: { $in: list.map((u) => u._id) } } },
        { $group: { _id: '$user', n: { $sum: 1 } } },
      ]);
      const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
      return list.map((u) => ({ ...plain(u), messageCount: byId[String(u._id)] || 0 }));
    },
  };

  const conversations = {
    async create(data) {
      return plain((await Conversation.create(data)).toObject());
    },
    async findById(id) {
      if (!isValidObjectId(id)) return null;
      return plain(await Conversation.findById(id).lean());
    },
    async listByUser(user, { search = '' } = {}) {
      const filter = { user };
      if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        const hits = await Message.distinct('conversation', { user, content: rx });
        filter.$or = [{ title: rx }, { _id: { $in: hits } }];
      }
      const list = await Conversation.find(filter).sort({ pinned: -1, lastMessageAt: -1 }).limit(200).lean();
      return list.map(plain);
    },
    async update(id, patch) {
      if (!isValidObjectId(id)) return null;
      return plain(await Conversation.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean());
    },
    async delete(id) {
      if (!isValidObjectId(id)) return;
      await Promise.all([Conversation.deleteOne({ _id: id }), Message.deleteMany({ conversation: id })]);
    },
    async deleteAllForUser(user) {
      await Promise.all([Conversation.deleteMany({ user }), Message.deleteMany({ user })]);
    },
  };

  const messages = {
    async create(data) {
      const m = await Message.create(data);
      await Conversation.updateOne(
        { _id: data.conversation },
        { $max: { lastMessageAt: m.createdAt }, $inc: { messageCount: 1 } }
      );
      return plain(m.toObject());
    },
    async findById(id) {
      if (!isValidObjectId(id)) return null;
      return plain(await Message.findById(id).lean());
    },
    async listByConversation(conversation, { limit } = {}) {
      if (limit) {
        const recent = await Message.find({ conversation }).sort({ createdAt: -1 }).limit(limit).lean();
        return recent.reverse().map(plain);
      }
      return (await Message.find({ conversation }).sort({ createdAt: 1 }).lean()).map(plain);
    },
    async update(id, patch) {
      if (!isValidObjectId(id)) return null;
      return plain(await Message.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean());
    },
    async delete(id) {
      if (!isValidObjectId(id)) return;
      const m = await Message.findByIdAndDelete(id).lean();
      if (m) await Conversation.updateOne({ _id: m.conversation }, { $inc: { messageCount: -1 } });
    },
  };

  const analytics = {
    async stats({ days = 14 } = {}) {
      const keys = lastDays(days);
      const start = new Date(`${keys[0]}T00:00:00.000Z`);
      const since7 = new Date(Date.now() - 7 * DAY);
      const dayExpr = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };

      const [
        usersCount,
        convCount,
        msgCount,
        active7,
        ratingAgg,
        latencyAgg,
        cacheHits,
        errors,
        dailyMsgs,
        dailyConvs,
        categories,
        top,
        hourlyAgg,
        feedback,
        activity,
      ] = await Promise.all([
        User.countDocuments(),
        Conversation.countDocuments(),
        Message.countDocuments(),
        User.countDocuments({ lastActiveAt: { $gte: since7 } }),
        Message.aggregate([
          { $match: { role: 'assistant', error: false } },
          { $group: { _id: '$rating', n: { $sum: 1 } } },
        ]),
        Message.aggregate([
          { $match: { role: 'assistant', cached: false, error: false, latencyMs: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$latencyMs' } } },
        ]),
        Message.countDocuments({ role: 'assistant', cached: true }),
        Message.countDocuments({ error: true }),
        Message.aggregate([
          { $match: { createdAt: { $gte: start } } },
          { $group: { _id: dayExpr, messages: { $sum: 1 }, users: { $addToSet: '$user' } } },
        ]),
        Conversation.aggregate([
          { $match: { createdAt: { $gte: start } } },
          { $group: { _id: dayExpr, n: { $sum: 1 } } },
        ]),
        Conversation.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
        Message.aggregate([
          { $match: { role: 'user' } },
          { $group: { _id: '$user', messages: { $sum: 1 } } },
          { $sort: { messages: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
        ]),
        Message.aggregate([{ $group: { _id: { $hour: '$createdAt' }, n: { $sum: 1 } } }]),
        Message.find({ role: 'assistant', rating: { $ne: 0 } })
          .sort({ updatedAt: -1 })
          .limit(8)
          .populate('user', 'name')
          .lean(),
        Conversation.find().sort({ lastMessageAt: -1 }).limit(10).populate('user', 'name').lean(),
      ]);

      const r = Object.fromEntries(ratingAgg.map((x) => [x._id, x.n]));
      const up = r[1] || 0;
      const down = r[-1] || 0;
      const dm = Object.fromEntries(dailyMsgs.map((d) => [d._id, d]));
      const dc = Object.fromEntries(dailyConvs.map((d) => [d._id, d.n]));
      const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, messages: 0 }));
      for (const h of hourlyAgg) hourly[h._id].messages = h.n;

      return {
        totals: {
          users: usersCount,
          conversations: convCount,
          messages: msgCount,
          activeUsers7d: active7,
          avgLatencyMs: Math.round(latencyAgg[0]?.avg || 0),
          satisfaction: up + down ? Math.round((up / (up + down)) * 100) : null,
          cacheHits,
          errors,
        },
        ratings: { up, down, unrated: r[0] || 0 },
        daily: keys.map((date) => ({
          date,
          messages: dm[date]?.messages || 0,
          activeUsers: dm[date]?.users.length || 0,
          conversations: dc[date] || 0,
        })),
        hourly,
        categories: categories.map((c) => ({ category: c._id, count: c.count })),
        topUsers: top.map((t) => ({
          id: String(t._id),
          name: t.u[0]?.name || 'Deleted user',
          email: t.u[0]?.email || '',
          messages: t.messages,
        })),
        recentFeedback: feedback.map((m) => ({
          id: String(m._id),
          rating: m.rating,
          feedback: m.feedback,
          excerpt: m.content.slice(0, 160),
          userName: m.user?.name || 'Unknown',
          updatedAt: m.updatedAt.toISOString(),
        })),
        recentActivity: activity.map((c) => ({
          id: String(c._id),
          title: c.title,
          category: c.category,
          messageCount: c.messageCount,
          lastMessageAt: c.lastMessageAt.toISOString(),
          userName: c.user?.name || 'Deleted user',
        })),
      };
    },
  };

  return {
    kind: 'mongodb',
    users,
    conversations,
    messages,
    analytics,
    close: () => mongoose.disconnect(),
  };
}
