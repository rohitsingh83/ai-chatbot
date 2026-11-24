import bcrypt from 'bcryptjs';
import { getStore } from '../store/index.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { conflict, unauthorized, badRequest } from '../utils/errors.js';
import { publicUser } from '../store/defaults.js';
import { disconnectUser } from '../sockets/io.js';

/** Revoke every token the user holds and return a fresh one for this device. */
async function rotateSessions(store, user, patch = {}) {
  const updated = await store.users.update(user.id, { ...patch, tokenVersion: (user.tokenVersion || 0) + 1 });
  disconnectUser(user.id);
  return signToken(updated);
}

export async function signup(req, res) {
  const store = getStore();
  const { name, email, password } = req.body;
  if (await store.users.findByEmail(email)) throw conflict('An account with this email already exists');
  // The very first account, or any email listed in ADMIN_EMAILS, gets admin rights.
  const isFirst = (await store.users.count()) === 0;
  const role = isFirst || env.adminEmails.includes(email) ? 'admin' : 'user';
  const user = await store.users.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const store = getStore();
  const { email, password } = req.body;
  const user = await store.users.findByEmail(email);
  // Same message for unknown email and wrong password: don't leak which accounts exist.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw unauthorized('Incorrect email or password');
  await store.users.touch(user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const user = await getStore().users.update(req.user.id, req.body);
  res.json({ user: publicUser(user) });
}

export async function changePassword(req, res) {
  const store = getStore();
  const user = await store.users.findById(req.user.id);
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
  const token = await rotateSessions(store, user, { passwordHash: await bcrypt.hash(req.body.newPassword, 10) });
  res.json({ ok: true, token });
}

export async function logoutAll(req, res) {
  const store = getStore();
  const user = await store.users.findById(req.user.id);
  res.json({ ok: true, token: await rotateSessions(store, user) });
}
