process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.AI_PROVIDER = 'demo';

const { createMemoryStore } = await import('../src/store/memoryStore.js');
const { setStore } = await import('../src/store/index.js');
const { createApp } = await import('../src/app.js');

export const store = createMemoryStore();
setStore(store);
export const app = createApp();

let n = 0;
export async function signup(request, overrides = {}) {
  n++;
  const body = { name: `Tester ${n}`, email: `tester${n}@example.com`, password: 'Password123', ...overrides };
  const res = await request(app).post('/api/auth/signup').send(body);
  return { ...res.body, password: body.password };
}
