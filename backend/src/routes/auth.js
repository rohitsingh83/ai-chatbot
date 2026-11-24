import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/errors.js';
import { signupSchema, loginSchema, profileSchema, passwordSchema } from '../utils/schemas.js';

const r = Router();
r.post('/signup', authLimiter, validate(signupSchema), asyncHandler(c.signup));
r.post('/login', authLimiter, validate(loginSchema), asyncHandler(c.login));
r.get('/me', requireAuth, asyncHandler(c.me));
r.patch('/me', requireAuth, validate(profileSchema), asyncHandler(c.updateProfile));
r.post('/logout-all', requireAuth, asyncHandler(c.logoutAll));
r.post('/me/password', requireAuth, authLimiter, validate(passwordSchema), asyncHandler(c.changePassword));
export default r;
