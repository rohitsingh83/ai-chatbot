import { getStore } from '../store/index.js';
import { generateReply, makeTitle } from './aiService.js';
import { notFound, forbidden, badRequest } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/** Load a conversation and make sure it belongs to the user. */
export async function getOwnedConversation(userId, conversationId) {
  const conv = await getStore().conversations.findById(conversationId);
  if (!conv) throw notFound('Conversation not found');
  if (conv.user !== userId) throw forbidden('This conversation belongs to someone else');
  return conv;
}

/**
 * Core chat flow, shared by Socket.io and the REST endpoint:
 * save the user's message, stream the AI reply, save the reply.
 *
 * Hooks: onUserMessage(msg), onStart({ conversationId }), onToken(token), onTool(step), onTitle(conv)
 */
export async function sendMessage({ user, conversationId, content = '', attachments = [], regenerate = false, signal, hooks = {} }) {
  const store = getStore();
  let conv;
  if (conversationId) {
    conv = await getOwnedConversation(user.id, conversationId);
  } else {
    conv = await store.conversations.create({ user: user.id, category: user.preferences?.defaultCategory || 'casual' });
    hooks.onConversation?.(conv);
  }

  let history = await store.messages.listByConversation(conv.id);

  if (regenerate) {
    // Drop the last assistant reply and answer the last user message again.
    const last = history[history.length - 1];
    if (last?.role === 'assistant') {
      await store.messages.delete(last.id);
      history = history.slice(0, -1);
    }
    if (!history.length || history[history.length - 1].role !== 'user') throw badRequest('Nothing to regenerate');
  } else {
    const userMsg = await store.messages.create({
      conversation: conv.id,
      user: user.id,
      role: 'user',
      content,
      ...(attachments.length ? { attachments } : {}),
    });
    hooks.onUserMessage?.(userMsg);
    history.push(userMsg);
    if (history.filter((m) => m.role === 'user').length === 1 && (conv.title === 'New chat' || !conv.title)) {
      const title = makeTitle(content || attachments.map((a) => a.name).join(', '));
      conv = await store.conversations.update(conv.id, { title });
      hooks.onTitle?.(conv);
    }
  }

  store.users.touch(user.id).catch(() => {});
  hooks.onStart?.({ conversationId: conv.id });

  try {
    const result = await generateReply({
      history,
      prefs: user.preferences,
      category: conv.category,
      userName: user.name?.split(' ')[0],
      signal,
      onToken: (t) => hooks.onToken?.(t),
      onTool: (step) => hooks.onTool?.(step),
    });
    const reply = await store.messages.create({
      conversation: conv.id,
      user: user.id,
      role: 'assistant',
      content: result.text || (result.stopped ? '_(stopped)_' : ''),
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      cached: result.cached,
      ...(result.tools?.length
        ? { tools: result.tools.map(({ name, label, status, error }) => ({ name, label, status: status === 'running' ? 'done' : status, ...(error ? { error } : {}) })) }
        : {}),
    });
    return { conversation: await store.conversations.findById(conv.id), message: reply, stopped: !!result.stopped };
  } catch (err) {
    logger.warn('AI generation failed:', err.message);
    const friendly =
      err.code === 'TIMEOUT'
        ? err.message
        : err.status === 401
          ? 'The AI provider rejected the API key. Check the backend configuration.'
          : err.status === 429
            ? 'The AI provider is rate limiting us. Please wait a moment and try again.'
            : 'The AI service is unavailable right now. Please try again.';
    const reply = await store.messages.create({
      conversation: conv.id,
      user: user.id,
      role: 'assistant',
      content: friendly,
      error: true,
    });
    const e = new Error(friendly);
    e.message_ = reply;
    e.conversation = conv;
    throw e;
  }
}
