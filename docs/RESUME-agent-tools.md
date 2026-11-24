# Paused: Nova agent tools, file attachments, database

Branch: `agent-tools` (not merged; `main` and the live site are unchanged).

## Done (backend, tested: 37/37 tests pass)
- Free tools, no API keys (`backend/src/services/tools/`): web_search (Bing HTML, falls back to DuckDuckGo Instant Answer, then Wikipedia), read_webpage (with a guard against private/internal addresses), get_weather (Open-Meteo), calculate (safe parser, no eval), get_current_time, wikipedia.
- Tool-calling loop in `providers/openai.js` (up to 5 rounds; if a model rejects tools it answers without them). The gateway passes the conversation to the next free model when one is rate limited mid-loop. Both free gateway models are tagged tool-use.
- `generateReply` emits tool steps (`onTool`), never caches answers that used tools, and adds today's date and tool guidance to the system prompt. `AI_TOOLS=false` turns tools off. `/api/health` reports `tools`.
- Socket event `chat:tool { conversationId, step }`; replies save a `tools` array.
- Attachments: messages accept `attachments[{name,type,size,text}]` (max 5, 30k chars each), stored on the user message and given to the AI. `POST /api/files/extract?name=` takes raw bytes (4 MB max) and returns the text, PDFs included (via `unpdf`).
- Mongo: optional `MONGODB_DB` env var picks the database name.

## Done (frontend, partially)
- Types (`Attachment`, `ToolStep`), `api.extractFile`, `api.sendMessageRest(..., attachments)`, chat context handles `chat:tool` and sends attachments. Type check is clean.

## Left to do
1. UI: show tool steps in `StreamingBubble` and on saved replies in `MessageBubble` ("Searching the web for …" chips).
2. UI: attach button + file chips in `Composer.tsx` (read text files in the browser, send PDFs to `/api/files/extract`), pass attachments from `ChatView` to `chat.send`; show attachment chips on user messages.
3. Test on a Vercel preview with a sandbox (real web search through the free models), then merge to `main`.
4. Database: connect the existing MongoDB Atlas store (Vercel → Storage → the MongoDB store → Connect Project → `nova-chatbot-api`) and set `MONGODB_DB=nova` so it stays apart from the other app's data. This is the one step Rohit has to click in the Vercel dashboard.
5. Update README / docs/API.md (tools, `chat:tool`, attachments, `/api/files/extract`).
