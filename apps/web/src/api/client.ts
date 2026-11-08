// Shared helper for calling our API. Every file in src/api/ uses this.
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Carries the HTTP status so callers can show a specific message (e.g. 413).
export class ApiError extends Error {
  status: number;

  constructor(status: number) {
    super(`Request failed: ${status}`);
    this.status = status;
  }
}

// For file uploads. Content-Type is left unset on purpose: the browser adds
// multipart/form-data with the boundary itself.
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) throw new ApiError(res.status);
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
