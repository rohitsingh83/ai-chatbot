/**
 * Offline demo model. Lets the whole app run (and be graded) with no API key.
 * It recognises a handful of intents, writes real markdown, and streams the
 * answer token by token so the UI behaves exactly as with a real model.
 */

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  });

const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

const CODE_SAMPLES = {
  python: {
    label: 'Python',
    code: `def fibonacci(n: int) -> list[int]:
    """Return the first n Fibonacci numbers."""
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]


if __name__ == "__main__":
    print(fibonacci(10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`,
  },
  javascript: {
    label: 'JavaScript',
    code: `/** Debounce: run fn only after \`wait\` ms of silence. */
export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const onResize = debounce(() => console.log(window.innerWidth), 200);
window.addEventListener('resize', onResize);`,
  },
  java: {
    label: 'Java',
    code: `import java.util.*;

public class WordCount {
    public static void main(String[] args) {
        String text = "the quick brown fox jumps over the lazy dog the end";
        Map<String, Integer> counts = new TreeMap<>();
        for (String w : text.split("\\\\s+")) {
            counts.merge(w, 1, Integer::sum);
        }
        counts.forEach((w, c) -> System.out.println(w + ": " + c));
    }
}`,
  },
  sql: {
    label: 'SQL',
    code: `-- Top 5 customers by revenue in the last 30 days
SELECT c.name, SUM(o.total) AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.name
ORDER BY revenue DESC
LIMIT 5;`,
  },
  react: {
    label: 'React',
    code: `import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      className="rounded-xl bg-violet-600 px-4 py-2 text-white"
    >
      Clicked {count} {count === 1 ? 'time' : 'times'}
    </button>
  );
}`,
  },
};

function detectLanguage(t) {
  if (/\breact|jsx|component\b/.test(t)) return 'react';
  if (/\bpython|py\b|django|flask/.test(t)) return 'python';
  if (/\bjava\b|spring/.test(t)) return 'java';
  if (/\bsql|query|database|postgres|mysql/.test(t)) return 'sql';
  return 'javascript';
}

function safeMath(expr) {
  if (!/^[\d\s+\-*/().%^]+$/.test(expr)) return null;
  try {
    // Only digits and operators reach this point, so evaluation is safe.
    const v = Function(`"use strict"; return (${expr.replace(/\^/g, '**')})`)();
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function compose({ text, botName, category, history }) {
  const t = text.toLowerCase().trim();
  const seed = hash(t);
  const name = botName || 'Nova';

  if (/^(hi|hello|hey|yo|hola|namaste|good (morning|afternoon|evening))\b/.test(t)) {
    return pick(
      [
        `Hey there! 👋 I'm **${name}**. I can help you brainstorm, write, explain concepts, or debug code.\n\nTry asking me to:\n- *Explain how WebSockets work*\n- *Write a Python function for Fibonacci*\n- *Give me 5 startup ideas*\n\nWhat's on your mind?`,
        `Hello! I'm **${name}**, your AI assistant. ✨ Ask me anything — from quick facts to code reviews. What would you like to work on today?`,
      ],
      seed
    );
  }

  if (/who are you|what are you|your name|what can you do|help me with|capabilities/.test(t)) {
    return `I'm **${name}**, a conversational AI assistant built with **Next.js**, **Express**, **Socket.io** and **MongoDB**.\n\nHere's what I can do:\n\n| Area | Examples |\n| --- | --- |\n| 💬 Conversation | Casual chat, advice, brainstorming |\n| 💼 Professional | Emails, summaries, plans |\n| 🎨 Creative | Stories, poems, names, taglines |\n| 💻 Coding | Snippets, explanations, debugging |\n\nYou can switch my **mode** with the selector at the top of the chat, rate my replies with 👍 / 👎, and change my name or theme in **Settings**.`;
  }

  const math = t.replace(/^(what is|what's|calculate|compute|solve)\s+/, '').replace(/[?=]/g, '').trim();
  const mathResult = safeMath(math);
  if (mathResult !== null && /\d/.test(math) && /[+\-*/^%]/.test(math)) {
    return `Let's work it out:\n\n\`\`\`\n${math} = ${+mathResult.toFixed(10)}\n\`\`\`\n\nThe answer is **${+mathResult.toFixed(10)}**.`;
  }

  if (/\b(time|date|day is it|today)\b/.test(t) && /what|which|tell/.test(t)) {
    const d = new Date();
    return `It's **${d.toUTCString()}** (UTC) on my server. Your local time may differ depending on your time zone. 🕒`;
  }

  if (/joke|make me laugh|funny/.test(t)) {
    return pick(
      [
        "Why do programmers prefer dark mode?\n\n…Because light attracts **bugs**. 🐛",
        "I told my computer I needed a break.\n\nIt said: *\"No problem — I'll go to sleep.\"* 💤",
        "There are 10 kinds of people in the world: those who understand binary and those who don't. 😄",
        "A SQL query walks into a bar, goes up to two tables and asks: *\"Can I join you?\"* 🍻",
      ],
      seed
    );
  }

  if (/websocket|socket\.io|real[- ]?time/.test(t)) {
    return `## How WebSockets work\n\nA **WebSocket** is a long-lived, two-way connection between the browser and the server.\n\n1. **Handshake** — the client sends a normal HTTP request with \`Upgrade: websocket\`.\n2. **Upgrade** — the server answers \`101 Switching Protocols\`, and the TCP connection stays open.\n3. **Full duplex** — both sides can now push messages at any time, with tiny frame overhead.\n\n### Why this app uses Socket.io\n- Automatic reconnection and fallbacks\n- Rooms (one per conversation)\n- Acknowledgements and events like \`chat:token\` and \`chat:done\`\n\n\`\`\`js\nsocket.emit('chat:send', { conversationId, content });\nsocket.on('chat:token', ({ token }) => append(token));\n\`\`\`\n\nThat's how my replies appear word by word without refreshing the page. ⚡`;
  }

  if (/\b(code|function|script|program|snippet|implement|write a|example in)\b/.test(t) || category === 'coding') {
    const lang = detectLanguage(t);
    const s = CODE_SAMPLES[lang];
    return `Here's a clean **${s.label}** example you can build on:\n\n\`\`\`${lang === 'react' ? 'jsx' : lang}\n${s.code}\n\`\`\`\n\n**How it works**\n- It keeps the logic small and focused on one job.\n- Names are descriptive, so it reads like documentation.\n- Edge cases are handled up front.\n\nWant me to add tests, explain a line, or translate it to another language?`;
  }

  if (/idea|brainstorm|suggest|names? for|tagline/.test(t) || category === 'creative') {
    return pick(
      [
        `Here are some fresh ideas to get you going 💡\n\n1. **StudyBuddy AI** — turns lecture notes into flashcards and quizzes.\n2. **LocalLoop** — a hyper-local marketplace for lending tools between neighbours.\n3. **MoodPlate** — suggests recipes based on how you're feeling and what's in your fridge.\n4. **CodeCoach** — reviews pull requests and explains feedback for beginners.\n5. **GreenRoute** — plans commutes that minimise carbon, not just time.\n\nWant me to go deeper on one of these — target users, features, or a pitch?`,
        `Let's get creative ✨\n\n> *The city hummed in binary, and somewhere between the ones and zeros, a small robot learned to dream.*\n\nI can continue this story, switch genres, or write a poem instead. Which direction should we take?`,
      ],
      seed
    );
  }

  if (/email|letter|cover letter|application|resume|summar/.test(t) || category === 'professional') {
    return `Here's a polished draft you can adapt:\n\n---\n\n**Subject:** Following up on our conversation\n\nHi [Name],\n\nThank you for taking the time to speak with me earlier. I really enjoyed learning more about [topic], and I'm excited about the opportunity to contribute to [team/project].\n\nAs discussed, I'll [next step] by [date]. Please let me know if there's anything else you need from me in the meantime.\n\nBest regards,\n[Your name]\n\n---\n\nWant it more formal, shorter, or tailored to a specific situation?`;
  }

  if (/explain|what is|what are|how does|how do|why/.test(t)) {
    const topic = text.replace(/^(can you |please )?(explain|what is|what are|how does|how do|why)\s*/i, '').replace(/\?$/, '') || 'that';
    return `Great question! Here's a clear way to think about **${topic}**:\n\n### The short version\nAt its core, ${topic} is best understood by looking at *what problem it solves*, *how it works*, and *where it's used*.\n\n### Key points\n- **Purpose** — why it exists and what it makes easier.\n- **Mechanism** — the main steps or parts involved.\n- **Trade-offs** — what it's good at and where it struggles.\n\n### An analogy\nThink of it like a well-organised kitchen: each part has a role, and the result depends on how they work together.\n\n> 💡 I'm running in **demo mode** right now, so my answers are templated. Add an \`ANTHROPIC_API_KEY\` or \`OPENAI_API_KEY\` to the backend for full AI-powered answers.`;
  }

  if (/thank|thanks|awesome|great|cool|nice/.test(t)) {
    return pick(["You're welcome! 😊 Anything else I can help with?", 'Happy to help! Let me know if you want to dig deeper. 🚀'], seed);
  }

  const turns = history.filter((m) => m.role === 'user').length;
  return `I hear you${turns > 1 ? ' — thanks for keeping the conversation going' : ''}! You said:\n\n> ${text.slice(0, 280)}\n\nHere's how I'd approach it:\n\n1. **Clarify the goal** — what would a great outcome look like?\n2. **Break it down** — split it into small, concrete steps.\n3. **Iterate** — try one step, learn, and adjust.\n\nTell me a bit more and I'll tailor the answer.\n\n> 💡 *Demo mode:* connect a real model by setting \`ANTHROPIC_API_KEY\` or \`OPENAI_API_KEY\` in \`backend/.env\`.`;
}

export function demoProvider() {
  return {
    name: 'demo',
    model: 'nova-demo-1',
    async *stream({ messages, signal, meta = {} }) {
      const last = messages[messages.length - 1]?.content || '';
      const reply = compose({ text: last, history: messages, ...meta });
      await sleep(350, signal); // "thinking"
      const tokens = reply.match(/\s+|[^\s]+/g) || [];
      for (const tok of tokens) {
        if (signal?.aborted) return;
        yield tok;
        if (/\S/.test(tok)) await sleep(12 + Math.random() * 28, signal);
      }
    },
  };
}
