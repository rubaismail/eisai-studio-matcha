// npm run setup — creates your local .env files from the examples (never overwrites).
import { copyFileSync, existsSync } from 'node:fs';

for (const app of ['apps/api', 'apps/web']) {
  if (existsSync(`${app}/.env`)) {
    console.log(`${app}/.env already exists, kept it.`);
  } else {
    copyFileSync(`${app}/.env.example`, `${app}/.env`);
    console.log(`Created ${app}/.env`);
  }
}
console.log(
  '\nNext: paste the Atlas connection string into apps/api/.env (MONGODB_URI=...).',
);
