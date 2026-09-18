import type { ComponentProps } from 'react';
import { cn } from '@/lib/ui/cn';

interface CardProps extends ComponentProps<'div'> {
  /** Adds the standard 20px inner padding. Off for cards that manage their own sections. */
  padded?: boolean;
}

/** White surface, 1px hairline border, 10px radius, resting shadow (PLAN.md section 13). */
export function Card({ padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface shadow-rest', padded && 'p-5', className)}
      {...props}
    />
  );
}
