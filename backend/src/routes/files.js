import express, { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { messageLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/errors.js';
import { extractText } from '../services/fileService.js';

const r = Router();
r.use(requireAuth);

/**
 * POST /api/files/extract?name=report.pdf
 * Body: the raw file bytes (any content type). Returns { name, type, size, text, truncated, pages? }.
 */
r.post(
  '/extract',
  messageLimiter,
  express.raw({ type: () => true, limit: '4mb' }),
  asyncHandler(async (req, res) => {
    const name = String(req.query.name || 'file').slice(0, 200);
    const type = String(req.headers['content-type'] || '').split(';')[0];
    res.json(await extractText({ buffer: req.body, name, type }));
  }),
);
export default r;
