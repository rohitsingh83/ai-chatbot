/**
 * Seed demo accounts and two weeks of activity so chat history and the admin
 * dashboard have something to show.
 *
 *   npm run seed            add demo data (skips if the demo admin already exists)
 *   npm run seed -- --force wipe the demo users' chats and reseed
 */
import { initStore } from '../store/index.js';
import { seedDemo, DEMO_PASSWORD } from './seedData.js';

const force = process.argv.includes('--force');
const store = await initStore();

if ((await store.users.findByEmail('admin@nova.dev')) && !force) {
  console.log('Demo data already present. Run with --force to reseed.');
} else {
  const r = await seedDemo(store);
  console.log(`Seeded ${r.users} users and ${r.conversations} conversations.`);
  console.log(`Log in as admin@nova.dev or demo@nova.dev with password "${DEMO_PASSWORD}".`);
}
await store.close();
process.exit(0);
