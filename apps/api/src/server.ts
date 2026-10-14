import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDatabase();
  createApp().listen(env.port, () => {
    console.log(`API running at http://localhost:${env.port}/api`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
