// Mirrors the API's checks in auth.controller.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_RE.test(email.trim()))
    return 'Enter a valid email address, like you@example.com.';
}

// Same rules as the API: 8+ characters, max 72 bytes, not trimmed.
export function newPasswordError(password: string): string | undefined {
  if (!password) return 'Enter a password.';
  if ([...password].length < 8) return 'Use at least 8 characters.';
  if (new TextEncoder().encode(password).length > 72)
    return 'That password is too long. Use 72 characters or fewer (fewer if it has emoji or accents).';
}

export function confirmPasswordError(
  password: string,
  confirmation: string,
): string | undefined {
  if (!confirmation) return 'Re-enter your password.';
  if (confirmation !== password) return 'Passwords don’t match.';
}
