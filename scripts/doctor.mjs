import './check-versions.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
let failed = false;
for (const args of [
  ['compose', 'version'],
  ['info', '--format', '{{.ServerVersion}}'],
]) {
  const r = spawnSync('docker', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(
      `Docker ${args[0]} unavailable. Install/start Docker Desktop or Docker Engine with Compose v2.`,
    );
    failed = true;
  } else console.log(r.stdout.trim());
}
for (const file of ['apps/api/.env', 'apps/web/.env']) {
  const found = existsSync(
    fileURLToPath(new URL(`../${file}`, import.meta.url)),
  );
  console.log(`${file}: ${found ? 'present' : 'missing; run npm run setup'}`);
  if (!found) failed = true;
}
console.log('Configuration values and credentials are never printed.');
process.exitCode = failed ? 1 : 0;
