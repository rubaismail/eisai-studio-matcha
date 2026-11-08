import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { focusRing, label as labelClass } from './styles';

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
> {
  label: string;
  error?: ReactNode;
  // Red border without a message (e.g. under an alert).
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export default function TextField({
  label,
  error,
  invalid,
  ref,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const isInvalid = Boolean(error) || invalid;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={`${labelClass} text-ink`}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={isInvalid || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`h-12 w-full px-3.5 text-[16px] text-ink placeholder:text-placeholder ${focusRing} ${
          isInvalid
            ? 'border-2 border-error bg-error-bg'
            : 'border border-ink bg-white'
        }`}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-[14px] leading-5 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
