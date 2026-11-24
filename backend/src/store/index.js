import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { createMemoryStore } from './memoryStore.js';

let store = null;

const here = path.dirname(fileURLToPath(import.meta.url));

/** Connect to MongoDB when MONGODB_URI is set, otherwise use the local demo store. */
export async function initStore() {
  if (store) return store;
  if (env.mongoUri) {
    const { createMongoStore } = await import('./mongoStore.js');
    store = await createMongoStore(env.mongoUri);
    logger.info('Connected to MongoDB');
  } else {
    store = createMemoryStore({
      file: env.isTest ? null : process.env.DATA_FILE ||
        // Serverless hosts (Vercel) only allow writes under /tmp.
        (process.env.VERCEL ? '/tmp/nova-db.json' : path.join(here, '../../data/dev-db.json')),
    });
    logger.warn('MONGODB_URI not set: using the local file store (fine for demos, not for production)');
  }
  return store;
}

export function getStore() {
  if (!store) throw new Error('Store not initialised');
  return store;
}

export function setStore(s) {
  store = s;
}
