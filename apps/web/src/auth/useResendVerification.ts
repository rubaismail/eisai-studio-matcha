import { useEffect, useRef, useState } from 'react';
import { resendVerification } from '../api/auth';
import { ApiError } from '../api/client';

export type ResendStatus =
  'idle' | 'sending' | 'sent' | 'rate-limited' | 'failed';

// The API skips sending if a link went out in the last minute.
const COOLDOWN_SECONDS = 60;
// The API allows 2 resends per email per 15 minutes.
const RATE_LIMIT_SECONDS = 15 * 60;

// The API treats addresses case-insensitively and limits each one separately.
const keyOf = (email: string) => email.trim().toLowerCase();

// sent: when a link last went out (e.g. at sign-up), so the first resend
// waits out the API's one-minute cooldown.
export function useResendVerification(sent?: { email: string; at: number }) {
  // Per address: when it can be sent again. A ref, so repeat clicks are
  // blocked at once; `now` re-renders the countdown.
  const waits = useRef<Map<string, number> | null>(null);
  if (waits.current === null) {
    waits.current = new Map();
    if (sent)
      waits.current.set(keyOf(sent.email), sent.at + COOLDOWN_SECONDS * 1000);
  }
  const busy = useRef(false);
  const [statuses, setStatuses] = useState<Record<string, ResendStatus>>({});
  const [now, setNow] = useState(() => Date.now());

  const waiting = [...waits.current.values()].some((until) => until > now);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  function secondsLeft(email: string) {
    const until = waits.current?.get(keyOf(email)) ?? 0;
    return Math.max(0, Math.ceil((until - now) / 1000));
  }

  function status(email: string): ResendStatus {
    return statuses[keyOf(email)] ?? 'idle';
  }

  // For the send button's disabled state.
  function blocked(email: string) {
    return status(email) === 'sending' || secondsLeft(email) > 0;
  }

  async function send(email: string) {
    const key = keyOf(email);
    const map = waits.current!;
    if (busy.current || Date.now() < (map.get(key) ?? 0)) return;
    busy.current = true;
    const set = (value: ResendStatus) =>
      setStatuses((current) => ({ ...current, [key]: value }));
    const wait = (seconds: number) => {
      map.set(key, Date.now() + seconds * 1000);
      setNow(Date.now());
    };
    set('sending');
    try {
      await resendVerification(email);
      set('sent');
      wait(COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        set('rate-limited');
        wait(err.retryAfterSeconds ?? RATE_LIMIT_SECONDS);
      } else {
        set('failed');
      }
    } finally {
      busy.current = false;
    }
  }

  return { send, status, secondsLeft, blocked };
}

export function formatWait(seconds: number): string {
  if (seconds <= 90)
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  return `${Math.ceil(seconds / 60)} minutes`;
}
