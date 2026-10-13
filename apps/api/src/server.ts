import './env.js';
import { createApp } from './app.js';
import { readConfig } from './config.js';
import { connectDatabase } from './database.js';
import type { MenuItem } from './menu.js';
try {
  const config = readConfig(process.env);
  const { client, db } = await connectDatabase(config);
  const app = createApp({
    origin: config.WEB_ORIGIN,
    ping: () => db.command({ ping: 1 }),
    listMenu: () =>
      db
        .collection<MenuItem>('menuItems')
        .find({ published: true }, { projection: { _id: 0 } })
        .sort({ slug: 1 })
        .toArray(),
  });
  const server = app.listen(config.API_PORT, config.API_HOST, () =>
    console.log(`API: http://${config.API_HOST}:${config.API_PORT}`),
  );
  server.on('error', async () => {
    console.error('API could not bind its port. Check API_HOST/API_PORT.');
    await client.close();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 5000).unref();
    server.close(() => {
      void client.close().finally(() => clearTimeout(deadline));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'API startup failed');
  process.exitCode = 1;
}
