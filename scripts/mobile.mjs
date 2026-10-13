import './check-versions.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const expected = readFileSync(
  new URL('../.flutter-version', import.meta.url),
  'utf8',
).trim();
const cwd = fileURLToPath(new URL('../apps/mobile', import.meta.url));
const command = process.platform === 'win32' ? 'flutter.bat' : 'flutter';
function run(args, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error || result.status !== 0) {
    console.error(
      `Flutter command failed. Install Flutter ${expected}, add its bin directory to PATH, and see docs/development.md.`,
    );
    process.exit(result.status || 1);
  }
  return result.stdout;
}
const version = JSON.parse(run(['--version', '--machine'], true));
if (version.frameworkVersion !== expected) {
  console.error(`Use Flutter ${expected}; found ${version.frameworkVersion}.`);
  process.exit(1);
}
const action = process.argv[2];
if (action === 'doctor') run(['doctor', '-v']);
else if (action === 'setup') run(['pub', 'get', '--enforce-lockfile']);
else if (action === 'check') {
  run(['pub', 'get', '--enforce-lockfile']);
  run(['analyze']);
  run(['test']);
  run(['build', 'web', '--dart-define=API_BASE_URL=/api']);
} else if (action === 'run') run(['run', ...process.argv.slice(3)]);
else {
  console.error('Expected doctor, setup, check, or run.');
  process.exit(1);
}
