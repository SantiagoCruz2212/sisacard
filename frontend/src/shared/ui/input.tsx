import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      className={`w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-[15px] text-fg outline-none focus:border-primary ${className}`}
      {...props}
    />
  );
  if (!label) return field;
  return (
    <label className="mb-3 block text-sm text-muted">
      {label}
      <div className="mt-1">{field}</div>
      {error && <p className="mt-1 text-bad">{error}</p>}
    </label>
  );
});
