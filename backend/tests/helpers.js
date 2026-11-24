process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AI_PROVIDER = 'demo';

const { createMemoryStore } = await import('../src/store/memoryStore.js');
const { setStore } = await import('../src/store/index.js');
const { createApp } = await import('../src/app.js');

// Runs against the in-memory store by default, or a real MongoDB when TEST_MONGODB_URI is set (CI does both).
async function makeStore() {
  if (!process.env.TEST_MONGODB_URI) return createMemoryStore();
  const { createMongoStore } = await import('../src/store/mongoStore.js');
  const mongoose = (await import('mongoose')).default;
  const s = await createMongoStore(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await s.close();
  const fresh = await createMongoStore(process.env.TEST_MONGODB_URI);
  fresh._reset = async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  };
  return fresh;
}

export const store = await makeStore();
setStore(store);

if (process.env.TEST_MONGODB_URI) {
  const { after } = await import('node:test');
  after(() => store.close());
}
export const app = createApp();

let n = 0;
export async function signup(request, overrides = {}) {
  n++;
  const body = { name: `Tester ${n}`, email: `tester${n}@example.com`, password: 'Password123', ...overrides };
  const res = await request(app).post('/api/auth/signup').send(body);
  return { ...res.body, password: body.password };
}
