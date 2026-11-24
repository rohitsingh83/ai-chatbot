# Nova API reference

Base URL: `http://localhost:4000/api` (set `NEXT_PUBLIC_API_URL` in the frontend to point elsewhere).

All protected endpoints need `Authorization: Bearer <token>`. Errors are returned as:

```json
{ "error": "Human readable message", "details": [{ "field": "email", "message": "Enter a valid email address" }] }
```

| Status | Meaning |
| --- | --- |
| 400 | Validation failed (`details` lists each field) |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but not allowed (someone else's chat, admin-only route) |
| 404 | Not found |
| 409 | Email already registered |
| 429 | Rate limited |
| 502 | The AI provider failed (the stored error reply is in `message`) |

---

## Health

`GET /health` → `{ status, provider, model, storage, time }`

## Auth

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/signup` | `{ name, email, password }` | `201 { token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | | `{ user }` |
| PATCH | `/auth/me` | `{ name?, preferences? }` | `{ user }` |
| POST | `/auth/me/password` | `{ currentPassword, newPassword }` | `{ ok: true, token }` (all other sessions are signed out; use the new token) |
| POST | `/auth/logout-all` | | `{ ok: true, token }` (revokes every other session and disconnects their sockets) |

Password rules: 8+ characters, at least one letter and one number. The first account created, and any email in `ADMIN_EMAILS`, becomes an admin.

`preferences` (all optional, partial updates are merged):

```json
{
  "botName": "Nova",
  "theme": "light | dark | system",
  "accent": "violet | blue | emerald | rose | amber",
  "defaultCategory": "casual | professional | creative | coding",
  "language": "auto | English | Hindi | …",
  "responseLength": "concise | balanced | detailed",
  "sendOnEnter": true,
  "customInstructions": "Up to 1,500 characters added to every system prompt"
}
```

Tokens carry a `tv` (token version) claim. Changing the password or calling `/auth/logout-all` bumps the user's version, so older tokens get `401 You were signed out`.

## Conversations

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/conversations?search=` | | `{ conversations }` (pinned first, newest first; search matches titles and message text) |
| POST | `/conversations` | `{ category?, title? }` | `201 { conversation }` |
| DELETE | `/conversations` | | `204` (deletes all of your chats) |
| GET | `/conversations/:id` | | `{ conversation, messages }` |
| PATCH | `/conversations/:id` | `{ title?, category?, pinned? }` | `{ conversation }` |
| DELETE | `/conversations/:id` | | `204` |
| GET | `/conversations/:id/export` | | Markdown file |
| POST | `/conversations/:id/messages` | `{ content }` | `201 { conversation, message }` (non-streaming; good for Postman) |
| PATCH | `/conversations/:id/messages/:messageId/rating` | `{ rating: -1 \| 0 \| 1, feedback? }` | `{ message }` |
| POST | `/conversations/:id/messages/:messageId/translate` | `{ language }` | `{ language, translation, cached }` (cached; `502` if the AI provider fails) |

## Admin (role `admin` only)

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/admin/stats?days=14` | Totals, daily activity, hourly activity, chat modes, ratings, top users, recent feedback, recent activity (latest conversations with user names) and system info |
| GET | `/admin/users?search=` | `{ users }` with message counts |
| PATCH | `/admin/users/:id/role` | Body `{ role: "user" \| "admin" }` → `{ user }` |

---

## Real-time (Socket.io)

Connect with the JWT:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000", { auth: { token } });
```

Every socket joins a private room for its user, so all of a user's open tabs receive the same events.

### Client → server

| Event | Payload | Ack |
| --- | --- | --- |
| `chat:send` | `{ conversationId?, content, clientId? }` | `{ ok: true, conversationId }` or `{ ok: false, error }` |
| `chat:regenerate` | `{ conversationId }` | same as above |
| `chat:stop` | `{ conversationId }` | none (keeps the partial answer) |

If `conversationId` is omitted, a new conversation is created.

### Server → client

| Event | Payload |
| --- | --- |
| `chat:conversation` | `{ conversation }` (created, renamed or updated) |
| `chat:user-message` | `{ message, clientId }` (the stored user message) |
| `chat:start` | `{ conversationId }` (AI started) |
| `chat:token` | `{ conversationId, token }` (one streamed chunk) |
| `chat:done` | `{ conversationId, message, stopped }` (the stored assistant reply) |
| `chat:error` | `{ conversationId, error, message? }` |

## Data model

```
User          { name, email (unique), passwordHash, role, preferences{…}, tokenVersion, lastActiveAt, createdAt }
Conversation  { user → User, title, category, pinned, messageCount, lastMessageAt }
              index: { user, pinned, lastMessageAt }
Message       { conversation → Conversation, user → User, role, content,
                rating, feedback, provider, model, latencyMs, cached, error }
              index: { conversation, createdAt }, { createdAt }, { role, rating }
```

## Limits

- REST: 300 requests/min per IP. Auth: 30 attempts per 15 min per IP.
- Chat messages: `RATE_LIMIT_MESSAGES_PER_MIN` (default 20) per user, over both HTTP and WebSockets.
- Messages up to 8,000 characters; JSON bodies up to 100 KB.
- AI calls time out after `AI_TIMEOUT_MS` (default 60 s) and retry once on 429/5xx before any text has streamed.
- Identical first questions in the same mode are served from an in-memory LRU cache for an hour.

## Postman

Import [`nova.postman_collection.json`](nova.postman_collection.json). Set `baseUrl` (default `http://localhost:4000/api`); the login request saves `token`, and creating a chat saves `conversationId` and `messageId` for the requests after it.
