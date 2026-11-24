import { env } from './config/env.js';
import { buildServer } from './bootstrap.js';
import { logger } from './utils/logger.js';

const { server, store } = await buildServer();

// On Vercel the platform owns the listener; everywhere else we listen ourselves.
if (!process.env.VERCEL) {
  server.listen(env.port, () => logger.info(`API listening on http://localhost:${env.port}`));
}

export default server;

const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close();
  await store.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
