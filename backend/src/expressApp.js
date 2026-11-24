import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import adminRoutes from './routes/admin.js';
import { getProvider } from './services/aiService.js';
import { getStore } from './store/index.js';
import { rememberOidcToken } from './services/providers/gateway.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render/Railway proxies
  app.use((req, _res, next) => {
    rememberOidcToken(req.headers);
    next();
  });
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin tools (curl, Postman) and the configured frontends.
        if (!origin || env.clientOrigins.includes(origin) || env.clientOrigins.includes('*')) return cb(null, true);
        cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(compression({ filter: (req, res) => !req.headers['x-no-compression'] && compression.filter(req, res) }));
  app.use(express.json({ limit: '100kb' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    const p = getProvider();
    res.json({ status: 'ok', provider: p.name, model: p.model, storage: getStore().kind, time: new Date().toISOString() });
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
