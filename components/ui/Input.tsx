import type { ComponentProps } from 'react';
import { cn } from '@/lib/ui/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-control border border-line-strong bg-surface px-3 text-base text-fg',
        'placeholder:text-fg-muted transition-colors duration-150 ease-out',
        'focus-visible:border-accent focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
