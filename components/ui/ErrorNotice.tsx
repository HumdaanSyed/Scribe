import { Button } from './Button';

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/** Inline, in-context error with an optional retry — for failures the user can act on right where they happened. */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-control border border-error/25 bg-error/5 p-3"
    >
      <p className="text-sm text-error">{message}</p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
