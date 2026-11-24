import { getStore } from '../store/index.js';
import { getOwnedConversation, sendMessage } from '../services/chatService.js';
import { notFound, forbidden } from '../utils/errors.js';

export async function list(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
  res.json({ conversations: await getStore().conversations.listByUser(req.user.id, { search }) });
}

export async function create(req, res) {
  const conv = await getStore().conversations.create({
    user: req.user.id,
    title: req.body.title || 'New chat',
    category: req.body.category || req.user.preferences?.defaultCategory || 'casual',
  });
  res.status(201).json({ conversation: conv });
}

export async function get(req, res) {
  const conv = await getOwnedConversation(req.user.id, req.params.id);
  const messages = await getStore().messages.listByConversation(conv.id);
  res.json({ conversation: conv, messages });
}

export async function update(req, res) {
  await getOwnedConversation(req.user.id, req.params.id);
  res.json({ conversation: await getStore().conversations.update(req.params.id, req.body) });
}

export async function remove(req, res) {
  await getOwnedConversation(req.user.id, req.params.id);
  await getStore().conversations.delete(req.params.id);
  res.status(204).end();
}

export async function removeAll(req, res) {
  await getStore().conversations.deleteAllForUser(req.user.id);
  res.status(204).end();
}

/** Non-streaming chat endpoint (handy for Postman and clients without WebSockets). */
export async function postMessage(req, res) {
  try {
    const result = await sendMessage({ user: req.user, conversationId: req.params.id, content: req.body.content });
    res.status(201).json(result);
  } catch (err) {
    if (err.message_) return res.status(502).json({ error: err.message, message: err.message_ });
    throw err;
  }
}

/** Markdown export of a conversation. */
export async function exportMarkdown(req, res) {
  const conv = await getOwnedConversation(req.user.id, req.params.id);
  const messages = await getStore().messages.listByConversation(conv.id);
  const bot = req.user.preferences?.botName || 'Nova';
  const body = [
    `# ${conv.title}`,
    `_Exported ${new Date().toUTCString()} · mode: ${conv.category}_`,
    '',
    ...messages.map((m) => `### ${m.role === 'user' ? req.user.name : bot}\n\n${m.content}\n`),
  ].join('\n');
  const safe = conv.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'chat';
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}.md"`);
  res.send(body);
}

export async function rateMessage(req, res) {
  const store = getStore();
  const msg = await store.messages.findById(req.params.messageId);
  if (!msg) throw notFound('Message not found');
  if (msg.user !== req.user.id) throw forbidden();
  if (msg.role !== 'assistant') throw forbidden('Only assistant replies can be rated');
  const patch = { rating: req.body.rating };
  if (req.body.feedback !== undefined) patch.feedback = req.body.feedback;
  res.json({ message: await store.messages.update(msg.id, patch) });
}
