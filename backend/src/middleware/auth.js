import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getStore } from '../store/index.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { publicUser } from '../store/defaults.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

/** Resolve a JWT to a user, or throw 401. Shared by HTTP and Socket.io. */
export async function userFromToken(token) {
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw unauthorized('Your session has expired. Please log in again.');
  }
  const user = await getStore().users.findById(payload.sub);
  if (!user) throw unauthorized('Account no longer exists');
  return publicUser(user);
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    req.user = await userFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') return next(forbidden('Admins only'));
  next();
}
