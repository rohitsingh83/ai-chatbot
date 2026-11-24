import { Router } from 'express';
import * as c from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/errors.js';
import { roleSchema } from '../utils/schemas.js';

const r = Router();
r.use(requireAuth, requireAdmin);
r.get('/stats', asyncHandler(c.stats));
r.get('/users', asyncHandler(c.users));
r.patch('/users/:id/role', validate(roleSchema), asyncHandler(c.setRole));
export default r;
