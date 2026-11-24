import http from 'node:http';
import { env } from './config/env.js';
import { initStore, getStore } from './store/index.js';
import { createApp } from './app.js';
import { attachSocket } from './sockets/chatSocket.js';
import { getProvider } from './services/aiService.js';
import { logger } from './utils/logger.js';

const store = await initStore();
getProvider();

// Local demo mode: fill an empty file store with demo accounts so the app is
// explorable right away. Disable with SEED_DEMO=false. (MongoDB: `npm run seed`.)
if (store.kind === 'memory' && process.env.SEED_DEMO !== 'false' && (await store.users.count()) === 0) {
  const { seedDemo, DEMO_PASSWORD } = await import('./scripts/seedData.js');
  await seedDemo(store);
  logger.info(`Seeded demo data. Log in as demo@nova.dev / ${DEMO_PASSWORD} (admin: admin@nova.dev)`);
}

const server = http.createServer(createApp());
attachSocket(server);

server.listen(env.port, () => logger.info(`API listening on http://localhost:${env.port}`));

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await getStore().close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
