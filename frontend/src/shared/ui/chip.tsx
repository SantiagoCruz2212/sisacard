import type { HTMLAttributes } from 'react';

const variants = {
  default: 'bg-line',
  turn: 'bg-primary text-white',
  off: 'bg-line opacity-40 line-through',
} as const;

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Chip({ variant = 'default', className = '', ...props }: ChipProps) {
  return <span className={`rounded-full px-3 py-1 text-sm ${variants[variant]} ${className}`} {...props} />;
}
