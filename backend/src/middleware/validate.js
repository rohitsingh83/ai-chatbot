import { badRequest } from '../utils/errors.js';

/** Validate req[part] against a zod schema and replace it with the parsed value. */
export const validate = (schema, part = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[part] ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest(issues[0]?.message || 'Invalid request', issues));
  }
  if (part === 'body') req.body = result.data;
  else req.validated = { ...(req.validated || {}), [part]: result.data };
  next();
};
