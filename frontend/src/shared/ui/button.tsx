import type { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-primary text-white',
  secondary: 'bg-line text-fg',
  ghost: 'bg-transparent text-muted',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm whitespace-nowrap hover:enabled:brightness-125 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
