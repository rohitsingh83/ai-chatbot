/** Demo accounts and two weeks of realistic activity. Shared by `npm run seed` and auto-seeding. */
import bcrypt from 'bcryptjs';

const DAY = 86_400_000;
export const DEMO_PASSWORD = 'Password123';

const ACCOUNTS = [
  { name: 'Admin User', email: 'admin@nova.dev', role: 'admin' },
  { name: 'Demo User', email: 'demo@nova.dev', role: 'user' },
  { name: 'Aarav Sharma', email: 'aarav@example.com', role: 'user' },
  { name: 'Priya Patel', email: 'priya@example.com', role: 'user' },
  { name: 'Liam Chen', email: 'liam@example.com', role: 'user' },
  { name: 'Sofia Garcia', email: 'sofia@example.com', role: 'user' },
];

const SCRIPTS = [
  ['coding', 'Explain closures in JavaScript', 'A **closure** is a function that remembers the variables from the scope where it was created, even after that scope has finished.\n\n```js\nfunction counter() {\n  let n = 0;\n  return () => ++n;\n}\nconst next = counter();\nnext(); // 1\nnext(); // 2\n```\n\n`next` keeps access to `n`, which is private to it.'],
  ['professional', 'Draft a short email asking for a project deadline extension', '**Subject:** Request for a short extension on the Q4 report\n\nHi Maya,\n\nI wanted to give you an early heads-up: to include the final survey data, I\'d like to request a two-day extension, moving delivery to Thursday.\n\nThanks for considering it.\n\nBest,\nAarav'],
  ['creative', 'Give me 5 names for a coffee shop run by robots', '1. **Byte & Brew**\n2. **The Steam Engine**\n3. **Circuit Café**\n4. **Latte.exe**\n5. **Bean Machine**'],
  ['casual', 'What should I cook tonight with rice, eggs and spinach?', 'Try a quick **spinach egg fried rice** 🍳\n\n1. Scramble 2 eggs and set aside.\n2. Sauté garlic, add spinach until wilted.\n3. Add cold rice, soy sauce, and the eggs.\n4. Finish with sesame oil and chilli flakes.'],
  ['coding', 'How do I create an index in MongoDB?', 'Use `createIndex` on the collection:\n\n```js\ndb.messages.createIndex({ conversation: 1, createdAt: 1 });\n```\n\nIn Mongoose, declare it on the schema:\n\n```js\nmessageSchema.index({ conversation: 1, createdAt: 1 });\n```'],
  ['casual', 'Tell me a fun fact about space', 'A day on **Venus** is longer than its year 🪐 It takes 243 Earth days to rotate once, but only 225 to orbit the Sun.'],
  ['professional', 'Summarise the benefits of WebSockets for a product manager', '- **Instant updates**: users see changes without refreshing.\n- **Lower latency** than polling.\n- **Less server load** for frequent updates.\n- Enables **live features**: chat, notifications, collaboration.'],
  ['creative', 'Write a haiku about debugging', '*Silent semicolon*\n*hiding in the midnight code*\n*coffee finds it first*'],
];

const FEEDBACK = ['Very clear, thanks!', 'Exactly what I needed', 'Could be more detailed', 'Great example', ''];

export async function seedDemo(store) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = [];
  for (const [i, a] of ACCOUNTS.entries()) {
    let u = await store.users.findByEmail(a.email);
    if (!u) {
      u = await store.users.create({ ...a, passwordHash: hash, createdAt: new Date(Date.now() - (14 - i) * DAY).toISOString() });
    } else {
      await store.conversations.deleteAllForUser(u.id);
    }
    users.push(u);
  }

  let rnd = 42;
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);

  let convCount = 0;
  for (let day = 13; day >= 0; day--) {
    const chatsToday = 2 + Math.floor(rand() * 4) + (day < 5 ? 2 : 0);
    for (let k = 0; k < chatsToday; k++) {
      const user = users[1 + Math.floor(rand() * (users.length - 1))];
      const [category, question, answer] = SCRIPTS[Math.floor(rand() * SCRIPTS.length)];
      const base = Date.now() - day * DAY - Math.floor(rand() * 24) * 3_600_000 - Math.floor(rand() * 60) * 60_000;
      const at = (offset) => new Date(Math.min(base + offset, Date.now() - 60_000)).toISOString();
      const conv = await store.conversations.create({ user: user.id, title: question.slice(0, 48), category, createdAt: at(0) });
      await store.messages.create({ conversation: conv.id, user: user.id, role: 'user', content: question, createdAt: at(0), updatedAt: at(0) });
      const r = rand();
      const rating = r < 0.55 ? 1 : r < 0.68 ? -1 : 0;
      await store.messages.create({
        conversation: conv.id,
        user: user.id,
        role: 'assistant',
        content: answer,
        provider: 'demo',
        model: 'nova-demo-1',
        latencyMs: 600 + Math.floor(rand() * 2400),
        cached: rand() < 0.1,
        rating,
        feedback: rating ? FEEDBACK[Math.floor(rand() * FEEDBACK.length)] : '',
        createdAt: at(4000),
        updatedAt: at(60_000),
      });
      convCount++;
    }
  }
  for (const u of users) await store.users.update(u.id, { lastActiveAt: new Date(Date.now() - Math.floor(rand() * 6) * DAY).toISOString() });

  return { users: users.length, conversations: convCount };
}
