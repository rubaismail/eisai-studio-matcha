import './check-versions.mjs';
import { copyFileSync, constants, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const dir of ['apps/api', 'apps/web']) {
  const target = path.join(root, dir, '.env');
  if (existsSync(target)) {
    console.log(`Preserved ${dir}/.env`);
    continue;
  }
  copyFileSync(
    path.join(root, dir, '.env.example'),
    target,
    constants.COPYFILE_EXCL,
  );
  console.log(`Created ${dir}/.env with local-only defaults`);
}
console.log('Next: npm run services:up → npm run db:seed → npm run dev');
console.log(
  'Flutter is optional for web/API contributors. See docs/development.md.',
);
