import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { userFromToken } from '../middleware/auth.js';
import { createSocketLimiter } from '../middleware/rateLimit.js';
import { sendMessage } from '../services/chatService.js';
import { sendMessageSchema } from '../utils/schemas.js';
import { getStore } from '../store/index.js';
import { logger } from '../utils/logger.js';
import * as presence from './presence.js';
import { setIO } from './io.js';

/**
 * Events (client -> server)
 *   chat:send        { conversationId?, content, clientId }    ack({ ok, conversationId } | { ok:false, error })
 *   chat:regenerate  { conversationId }                         ack(...)
 *   chat:stop        { conversationId }
 *
 * Events (server -> client), emitted to the room "user:<id>" so every open tab stays in sync
 *   chat:conversation  { conversation }                 a chat was created or renamed
 *   chat:user-message  { message, clientId }            the stored user message
 *   chat:start         { conversationId }               the AI started answering
 *   chat:token         { conversationId, token }        one streamed chunk
 *   chat:done          { conversationId, message }      the stored assistant reply
 *   chat:error         { conversationId, error, message? }
 */
export function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    maxHttpBufferSize: 64 * 1024,
  });
  setIO(io);
  const limiter = createSocketLimiter();
  const active = new Map(); // conversationId -> AbortController

  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromToken(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error(err.message || 'Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    const room = `user:${userId}`;
    socket.join(room);
    presence.join(userId);

    const run = async ({ conversationId, content, clientId, regenerate }, ack = () => {}) => {
      const gate = limiter(userId);
      if (!gate.ok) {
        return ack({ ok: false, error: `You're sending messages too fast. Try again in ${Math.ceil(gate.retryInMs / 1000)}s.` });
      }
      if (regenerate && !conversationId) return ack({ ok: false, error: 'Nothing to regenerate' });
      if (!regenerate) {
        const parsed = sendMessageSchema.safeParse({ content });
        if (!parsed.success) return ack({ ok: false, error: parsed.error.issues[0].message });
        content = parsed.data.content;
      }
      if (conversationId && active.has(conversationId)) {
        return ack({ ok: false, error: 'Please wait for the current reply to finish.' });
      }

      // Refresh the user so newly saved preferences (bot name, language...) apply immediately.
      const user = (await getStore().users.findById(userId)) || socket.data.user;
      const controller = new AbortController();
      let convId = conversationId;
      if (convId) active.set(convId, controller);

      try {
        const result = await sendMessage({
          user,
          conversationId,
          content,
          regenerate,
          signal: controller.signal,
          hooks: {
            onConversation: (conv) => {
              convId = conv.id;
              active.set(convId, controller);
              io.to(room).emit('chat:conversation', { conversation: conv });
            },
            onUserMessage: (message) => io.to(room).emit('chat:user-message', { message, clientId }),
            onTitle: (conv) => io.to(room).emit('chat:conversation', { conversation: conv }),
            onStart: ({ conversationId: id }) => {
              ack({ ok: true, conversationId: id });
              io.to(room).emit('chat:start', { conversationId: id });
            },
            onToken: (token) => io.to(room).emit('chat:token', { conversationId: convId, token }),
          },
        });
        io.to(room).emit('chat:done', { conversationId: convId, message: result.message, stopped: result.stopped });
        io.to(room).emit('chat:conversation', { conversation: result.conversation });
      } catch (err) {
        ack({ ok: false, error: err.message });
        io.to(room).emit('chat:error', { conversationId: convId, error: err.message, message: err.message_ });
      } finally {
        if (convId) active.delete(convId);
      }
    };

    socket.on('chat:send', (payload = {}, ack) => run({ ...payload, regenerate: false }, ack));
    socket.on('chat:regenerate', (payload = {}, ack) => run({ conversationId: payload.conversationId, regenerate: true }, ack));
    socket.on('chat:stop', ({ conversationId } = {}) => active.get(conversationId)?.abort());
    socket.on('disconnect', () => presence.leave(userId));
  });

  logger.info('Socket.io ready');
  return io;
}
