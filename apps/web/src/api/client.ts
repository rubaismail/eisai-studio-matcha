// Shared helper for calling our API. Every file in src/api/ uses this.
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
}

// For any method. Sends the body as JSON and adds the signed-in user's token.
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body }: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}
