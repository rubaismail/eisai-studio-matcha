// Shared helper for calling our API. Every file in src/api/ uses this.
import { getToken } from '../auth/session';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Carries the HTTP status so callers can show a specific message (e.g. 413).
export class ApiError extends Error {
  status: number;
  serverMessage?: string;
  retryAfterSeconds?: number;

  constructor(
    status: number,
    serverMessage?: string,
    retryAfterSeconds?: number,
  ) {
    super(serverMessage ?? `Request failed: ${status}`);
    this.status = status;
    this.serverMessage = serverMessage;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Set by AuthProvider to sign out on a 401.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function toApiError(res: Response): Promise<ApiError> {
  let serverMessage: string | undefined;
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string') serverMessage = body.error;
  } catch {
    // Not JSON.
  }
  // Retry-After is hidden cross-origin unless the API exposes it.
  const retryAfter = Number(res.headers?.get('Retry-After'));
  return new ApiError(
    res.status,
    serverMessage,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  );
}

async function send<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> },
  sendToken: boolean,
): Promise<T> {
  const headers: Record<string, string> = { ...init.headers };
  const token = sendToken ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    // Ignore 401s for an old token.
    if (res.status === 401 && token && getToken() === token) onUnauthorized?.();
    throw await toApiError(res);
  }
  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return send<T>(path, {}, false);
}

// For file uploads. Content-Type is left unset on purpose: the browser adds
// multipart/form-data with the boundary itself.
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return send<T>(path, { method: 'POST', body: form }, true);
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  // false = don't send the token (login, register, etc.)
  auth?: boolean;
}

// For any method. Sends the body as JSON and adds the signed-in user's token.
export function apiRequest<T>(
  path: string,
  { method = 'GET', body, auth = true }: ApiRequestOptions = {},
): Promise<T> {
  return send<T>(
    path,
    {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    auth,
  );
}
