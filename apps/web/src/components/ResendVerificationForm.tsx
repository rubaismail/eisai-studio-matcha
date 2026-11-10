import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useResendVerification } from '../auth/useResendVerification';
import { emailError } from '../auth/validation';
import ResendStatusMessage from './ResendStatusMessage';
import TextField from './TextField';
import { primaryButton } from './styles';

// Email field + "Send a new link", for when we don't know the address.
// Waits and messages follow the typed address, so fixing a typo isn't blocked.
export default function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const emailRef = useRef<HTMLInputElement>(null);
  const resend = useResendVerification();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = emailError(email);
    setError(problem);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    void resend.send(email);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-[18px] md:gap-5"
    >
      <TextField
        ref={emailRef}
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(undefined);
        }}
        error={error}
      />
      <button
        type="submit"
        disabled={resend.blocked(email)}
        className={`w-full ${primaryButton}`}
      >
        {resend.status(email) === 'sending' ? 'Sending…' : 'Send a new link →'}
      </button>
      <ResendStatusMessage
        status={resend.status(email)}
        secondsLeft={resend.secondsLeft(email)}
      />
    </form>
  );
}
