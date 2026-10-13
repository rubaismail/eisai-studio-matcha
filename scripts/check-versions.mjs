import { readFileSync } from 'node:fs';
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url)),
);
const expected = pkg.engines.node;
if (process.versions.node !== expected) {
  console.error(
    `Use Node ${expected}; found ${process.versions.node}. See docs/development.md.`,
  );
  process.exit(1);
}
const npmVersion =
  process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1];
if (npmVersion && npmVersion !== pkg.engines.npm) {
  console.error(
    `Use npm ${pkg.engines.npm}; found ${npmVersion}. It is bundled with the pinned Node release.`,
  );
  process.exit(1);
}
