import { useEffect, useRef, useState } from 'react';
import { resendVerification } from '../api/auth';
import { ApiError } from '../api/client';

export type ResendStatus =
  'idle' | 'sending' | 'sent' | 'rate-limited' | 'failed';

// The API skips sending if a link went out in the last minute.
const COOLDOWN_SECONDS = 60;
// The API allows 2 resends per email per 15 minutes.
const RATE_LIMIT_SECONDS = 15 * 60;

export function useResendVerification() {
  const [status, setStatus] = useState<ResendStatus>('idle');
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Refs block repeat clicks at once; state only updates on the next render.
  const busy = useRef(false);
  const blockedUntil = useRef(0);

  useEffect(() => {
    if (waitUntil === null) return;
    // One timer ends the wait; the other only updates the countdown text.
    const end = setTimeout(
      () => setWaitUntil(null),
      Math.max(0, waitUntil - Date.now()),
    );
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(end);
      clearInterval(tick);
    };
  }, [waitUntil]);

  function wait(seconds: number) {
    const current = Date.now();
    setNow(current);
    setWaitUntil(current + seconds * 1000);
    blockedUntil.current = current + seconds * 1000;
  }

  async function send(email: string) {
    if (busy.current || Date.now() < blockedUntil.current) return;
    busy.current = true;
    setStatus('sending');
    try {
      await resendVerification(email);
      setStatus('sent');
      wait(COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setStatus('rate-limited');
        wait(err.retryAfterSeconds ?? RATE_LIMIT_SECONDS);
      } else {
        setStatus('failed');
      }
    } finally {
      busy.current = false;
    }
  }

  const secondsLeft =
    waitUntil === null ? 0 : Math.max(0, Math.ceil((waitUntil - now) / 1000));

  return { status, secondsLeft, send };
}

export function formatWait(seconds: number): string {
  if (seconds <= 90)
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minutes`;
}
