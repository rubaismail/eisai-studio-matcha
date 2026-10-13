import { z } from 'zod';
export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  MONGODB_DB: z.string().min(1),
  ALLOW_DEV_SEED: z.enum(['true', 'false']).default('false'),
});
export type Config = z.infer<typeof configSchema>;
export function readConfig(env: NodeJS.ProcessEnv): Config {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(
      `Invalid API configuration: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}. Check apps/api/.env against .env.example.`,
    );
  }
  return result.data;
}
export function assertSeedAllowed(config: Config) {
  if (
    config.NODE_ENV !== 'development' ||
    config.ALLOW_DEV_SEED !== 'true' ||
    !/^eisai_dev_[a-z0-9_]+$/.test(config.MONGODB_DB)
  ) {
    throw new Error(
      'Seeding requires NODE_ENV=development, ALLOW_DEV_SEED=true and a database named eisai_dev_<name>. No data was changed.',
    );
  }
}
