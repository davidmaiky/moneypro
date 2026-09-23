import express from 'express';
import { apiRouter } from './api';
import type { Plugin } from 'vite';

export function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      const app = express();
      app.use(express.json({ limit: '50mb' }));
      app.use('/api', apiRouter);
      server.middlewares.use(app);
    },
  };
}
