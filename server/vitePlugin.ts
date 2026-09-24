import express from 'express';
import { apiRouter } from './api';
import { requestLogger } from './logger';
import { restrictedCors, securityHeaders } from './security';
import type { Plugin } from 'vite';

export function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      const app = express();

      // Apply Security Headers & Restricted CORS
      app.use(securityHeaders);
      app.use(restrictedCors);

      // Structured Request Logging & Correlation IDs
      app.use(requestLogger);

      app.use(express.json({ limit: '50mb' }));
      app.use('/api', apiRouter);

      server.middlewares.use(app);
    },
  };
}
