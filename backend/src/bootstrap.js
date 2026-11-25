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

  // Fill an empty database with demo accounts so the app is explorable right away
  // (file store or MongoDB). Disable with SEED_DEMO=false.
  if (process.env.SEED_DEMO !== 'false' && (await store.users.count()) === 0) {
    try {
      const { seedDemo, DEMO_PASSWORD } = await import('./scripts/seedData.js');
      await seedDemo(store);
      logger.info(`Seeded demo data. Log in as demo@nova.dev / ${DEMO_PASSWORD} (admin: admin@nova.dev)`);
    } catch (err) {
      // Another server instance may have seeded at the same moment.
      logger.warn('Demo seeding skipped:', err.message);
    }
  }

  const server = http.createServer(createApp());
  attachSocket(server);
  return { server, store };
}
