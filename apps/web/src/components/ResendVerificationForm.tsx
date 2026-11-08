import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useResendVerification } from '../auth/useResendVerification';
import { emailError } from '../auth/validation';
import ResendStatusMessage from './ResendStatusMessage';
import TextField from './TextField';
import { primaryButton } from './styles';

// Email field + "Send a new link", for when we don't know the address.
export default function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const emailRef = useRef<HTMLInputElement>(null);
  const { status, secondsLeft, send } = useResendVerification();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = emailError(email);
    setError(problem);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    void send(email);
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
        onChange={(e) => setEmail(e.target.value)}
        error={error}
      />
      <button
        type="submit"
        disabled={status === 'sending' || secondsLeft > 0}
        className={`w-full ${primaryButton}`}
      >
        {status === 'sending' ? 'Sending…' : 'Send a new link →'}
      </button>
      <ResendStatusMessage status={status} secondsLeft={secondsLeft} />
    </form>
  );
}
