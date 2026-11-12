import { apiRequest } from './client';
import type { LoginResponse, RegisterInput } from '../types/auth';

interface MessageResponse {
  message: string;
}

// The API rejects extra fields.
export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email: email.trim(), password },
    auth: false,
  });
}

export function register(input: RegisterInput): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

export function verifyEmail(token: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    `/auth/verify?token=${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: { email: email.trim() },
    auth: false,
  });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email: email.trim() },
    auth: false,
  });
}

// Token goes in the query string, not the body.
export function resetPassword(
  token: string,
  password: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    `/auth/reset-password?token=${encodeURIComponent(token)}`,
    { method: 'POST', body: { password }, auth: false },
  );
}

// Needs the login token. Throws ApiError with the status so the page can tell
// a wrong password (403), the last admin (409) and rate limiting (429) apart.
// A wrong password is 403, not 401, so the user isn't signed out.
export function deleteAccount(password: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>('/auth/delete-account', {
    method: 'POST',
    body: { password },
  });
}
