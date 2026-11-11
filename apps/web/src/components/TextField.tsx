import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { focusRing, label as labelClass } from './styles';

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
> {
  label: string;
  // Help text under the field; an error replaces it.
  hint?: ReactNode;
  error?: ReactNode;
  // Red border without a message (e.g. under an alert).
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export default function TextField({
  label,
  hint,
  error,
  invalid,
  ref,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isInvalid = Boolean(error) || invalid;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`${labelClass} text-ink`}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={`h-12 w-full px-3.5 text-[16px] text-ink placeholder:text-placeholder ${focusRing} ${
          isInvalid
            ? 'border-2 border-error bg-error-bg'
            : 'border border-ink bg-white'
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-[14px] leading-5 text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={hintId}
            className="text-[14px] leading-[21px] text-ink-muted md:leading-5"
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}
