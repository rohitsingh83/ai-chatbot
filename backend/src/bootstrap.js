import http from 'node:http';
import { initStore } from './store/index.js';
import { createApp } from './expressApp.js';
import { attachSocket } from './sockets/chatSocket.js';
import { getProvider } from './services/aiService.js';
import { logger } from './utils/logger.js';

/** Connect storage, seed the demo store if empty, and build the HTTP + Socket.io server. */
export async function buildServer() {
  const store = await initStore();
  getProvider();

  // Demo mode: fill an empty file store with demo accounts so the app is
  // explorable right away. Disable with SEED_DEMO=false. (MongoDB: `npm run seed`.)
  if (store.kind === 'memory' && process.env.SEED_DEMO !== 'false' && (await store.users.count()) === 0) {
    const { seedDemo, DEMO_PASSWORD } = await import('./scripts/seedData.js');
    await seedDemo(store);
    logger.info(`Seeded demo data. Log in as demo@nova.dev / ${DEMO_PASSWORD} (admin: admin@nova.dev)`);
  }

  const server = http.createServer(createApp());
  attachSocket(server);
  return { server, store };
}
