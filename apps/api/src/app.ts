import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { MenuItem } from './menu.js';
export interface AppDependencies {
  origin: string;
  ping: () => Promise<unknown>;
  listMenu: () => Promise<MenuItem[]>;
}
export function createApp(deps: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: deps.origin }));
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', async (_req, res) => {
    try {
      await deps.ping();
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
  });
  app.get('/api/menu', async (_req, res) => {
    res.json({ items: await deps.listMenu() });
  });
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  const onError: express.ErrorRequestHandler = (err, _req, res, _next) => {
    const badJson =
      err instanceof SyntaxError && 'status' in err && err.status === 400;
    res
      .status(badJson ? 400 : 500)
      .json({ error: badJson ? 'Invalid JSON' : 'Request failed' });
  };
  app.use(onError);
  return app;
}
