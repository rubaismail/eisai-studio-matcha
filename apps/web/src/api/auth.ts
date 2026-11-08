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
