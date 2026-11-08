import type { ResendStatus } from '../auth/useResendVerification';
import { formatWait } from '../auth/useResendVerification';

const messages: Partial<Record<ResendStatus, string>> = {
  sent: 'If that address still needs verifying, a new link is on its way.',
  'rate-limited': 'You’ve asked for several links already.',
  failed: 'Couldn’t send a new link. Please try again.',
};

// The status line is always rendered so screen readers announce it. The
// countdown sits outside it so it isn't re-read every second.
export default function ResendStatusMessage({
  status,
  secondsLeft,
}: {
  status: ResendStatus;
  secondsLeft: number;
}) {
  const message = messages[status] ?? '';
  const isError = status === 'rate-limited' || status === 'failed';
  let waitText = '';
  if (secondsLeft > 0) {
    waitText =
      status === 'rate-limited'
        ? `Please try again in ${formatWait(secondsLeft)}.`
        : `You can ask for a new link in ${formatWait(secondsLeft)}.`;
  }

  return (
    // Out of the layout when empty, but still on the page for screen readers.
    <div className={message || waitText ? 'flex flex-col gap-1' : 'sr-only'}>
      <p
        role="status"
        className={`text-[14px] leading-[21px] ${isError ? 'text-error' : 'text-ink'}`}
      >
        {message}
      </p>
      {waitText && (
        <p className="text-[14px] leading-[21px] text-ink-muted">{waitText}</p>
      )}
    </div>
  );
}
