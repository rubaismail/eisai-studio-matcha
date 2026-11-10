import { requireEmailConfig, requireWebOrigin } from '../config/env.js';
import { validateProductionConfig } from '../config/production.js';
try {
  if (process.env.NODE_ENV !== 'production') throw new Error('Set NODE_ENV=production for deployment preflight.');
  validateProductionConfig(process.env);
  requireEmailConfig();
  requireWebOrigin();
  console.log('Production configuration passed. Database, email delivery and S3 access still require live smoke tests.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Preflight failed.');
  process.exitCode = 1;
}
