import { isIP } from 'node:net';

// Trust addresses, never arbitrary hop counts or all forwarding headers.
export function parseTrustProxy(value: string | undefined): false | string[] {
  const setting = value?.trim();
  if (!setting || setting === 'false') return false;

  const proxies = setting.split(',').map((entry) => entry.trim());
  for (const proxy of proxies) {
    if (proxy === 'loopback') continue;
    const [address, prefix, extra] = proxy.split('/');
    const version = isIP(address);
    const maxPrefix = version === 4 ? 32 : 128;
    if (
      !version ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) < 1 ||
          Number(prefix) > maxPrefix))
    ) {
      throw new Error(
        'TRUST_PROXY must be empty, false, loopback, or a comma-separated list of proxy IP addresses/CIDRs. Universal /0 ranges, true and hop counts are not allowed.',
      );
    }
  }
  return proxies;
}
