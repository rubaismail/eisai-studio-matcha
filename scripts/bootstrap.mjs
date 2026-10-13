// Runs with an existing Node >=18; installs project-local tools without changing system defaults.
import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const tools = path.join(root, '.tools');
const version = readFileSync(path.join(root, '.node-version'), 'utf8').trim();
const flutterVersion = readFileSync(
  path.join(root, '.flutter-version'),
  'utf8',
).trim();
const flutterCommit = 'adc901062556672b4138e18a4dc62a4be8f4b3c2';
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command} failed: ${result.stderr || result.error?.message || 'see output'}`,
    );
  return result.stdout?.trim();
}
async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Download failed: ${url} (${response.status})`);
  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
}
try {
  if (
    !['darwin', 'linux', 'win32'].includes(process.platform) ||
    !['arm64', 'x64'].includes(process.arch)
  )
    throw new Error(
      'Supported: macOS, Linux or Windows on x64/arm64. Install tools manually for other platforms.',
    );
  mkdirSync(tools, { recursive: true });
  const nodeDir = path.join(tools, 'node');
  const nodeExe = path.join(
    nodeDir,
    process.platform === 'win32' ? 'node.exe' : 'bin/node',
  );
  if (existsSync(nodeDir)) {
    if (run(nodeExe, ['--version']) !== `v${version}`)
      throw new Error(
        'Existing .tools/node has a different version. Move it aside before bootstrapping an upgrade.',
      );
    console.log(`Node ${version} already installed locally.`);
  } else {
    const platform = process.platform === 'win32' ? 'win' : process.platform;
    const folder = `node-v${version}-${platform}-${process.arch}`;
    const archive = `${folder}.${process.platform === 'win32' ? 'zip' : 'tar.gz'}`;
    const url = `https://nodejs.org/dist/v${version}`;
    const sumResponse = await fetch(`${url}/SHASUMS256.txt`);
    if (!sumResponse.ok)
      throw new Error('Cannot retrieve official Node checksums.');
    const checksums = await sumResponse.text();
    const line = checksums
      .split('\n')
      .find((line) => line.trim().split(/\s+/)[1] === archive);
    if (!line)
      throw new Error('Archive missing from official Node checksum list.');
    const archivePath = path.join(tools, archive);
    console.log(`Downloading Node ${version} for ${platform}/${process.arch}…`);
    await download(`${url}/${archive}`, archivePath);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(archivePath)) hash.update(chunk);
    if (hash.digest('hex') !== line.trim().split(/\s+/)[0]) {
      rmSync(archivePath);
      throw new Error('Node archive checksum mismatch; stopped.');
    }
    run('tar', ['-xf', archivePath, '-C', tools]);
    renameSync(path.join(tools, folder), nodeDir);
    rmSync(archivePath);
    if (run(nodeExe, ['--version']) !== `v${version}`)
      throw new Error('Downloaded Node did not report the expected version.');
    console.log(`Installed and verified Node ${version}.`);
  }
  if (process.argv.includes('--mobile')) {
    const flutterDir = path.join(tools, 'flutter');
    if (!existsSync(flutterDir))
      run(
        'git',
        [
          'clone',
          '--depth',
          '1',
          '--branch',
          flutterVersion,
          'https://github.com/flutter/flutter.git',
          flutterDir,
        ],
        { stdio: 'inherit' },
      );
    if (run('git', ['-C', flutterDir, 'rev-parse', 'HEAD']) !== flutterCommit)
      throw new Error('Flutter checkout does not match the pinned revision.');
    console.log(
      `Flutter ${flutterVersion} checkout verified. SDK components download on first use.`,
    );
  }
  console.log(
    process.platform === 'win32'
      ? 'Next: . ./scripts/activate.ps1'
      : 'Next: source ./scripts/activate.sh',
  );
  console.log('Then: npm ci && npm run setup. See docs/development.md.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
