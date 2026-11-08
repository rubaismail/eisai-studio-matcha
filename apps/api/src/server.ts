import { env, requireEmailConfig, requireWebOrigin } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { validateProductionConfig } from './config/production.js';
import { createApp } from './app.js';

try {
  validateProductionConfig(process.env);
  if (env.isProduction) {
    requireEmailConfig();
    requireWebOrigin();
  }
  await connectDatabase();
  const server = createApp().listen(env.port, process.env.HOST ?? '0.0.0.0', () => {
    console.log(`API listening on port ${env.port}`);
  });
  let stopping = false;
  const stop = (exitCode: number) => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 15_000);
    timeout.unref();
    server.close(() => {
      void disconnectDatabase().then(() => {
        clearTimeout(timeout);
        process.exit(exitCode);
      }).catch(() => process.exit(1));
    });
  };
  server.on('error', () => {
    console.error('API could not listen on the configured address.');
    stop(1);
  });
  process.once('SIGTERM', () => stop(0));
  process.once('SIGINT', () => stop(0));
} catch (error) {
  // Configuration messages contain setting names, not credential values.
  console.error(error instanceof Error ? error.message : 'API startup failed.');
  process.exit(1);
}
