// Read-only deployment checks: no accounts, tokens, menu items or uploads are created.
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4000');
if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
  throw new Error('Provide an HTTP(S) origin without credentials, query or fragment.');
}
const checks = [
  ['/api/health', 200, body => body.status === 'ok'],
  ['/api/menu', 200, body => Array.isArray(body.items)],
  ['/api/admin/menu', 401, body => typeof body.error === 'string'],
];
for (const [path, expected, validate] of checks) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10_000), redirect: 'error' });
  if (response.status !== expected || !validate(await response.json())) {
    throw new Error(`${path}: expected ${expected} with the documented JSON shape; smoke check failed.`);
  }
  console.log(`PASS ${path} (${expected})`);
}
console.log('Read-only API smoke checks passed. Complete the authenticated/email/upload checklist before launch.');
