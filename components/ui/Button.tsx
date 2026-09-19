import type { ComponentProps } from 'react';
import { cn } from '@/lib/ui/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
}

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium ' +
  'transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white enabled:hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-fg enabled:hover:bg-sunken',
  ghost: 'text-fg-secondary enabled:hover:bg-sunken enabled:hover:text-fg',
  danger: 'bg-error text-white enabled:hover:brightness-90',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
};

export function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}
