import type { RecorderStatus } from '@/lib/hooks/useRecorder';
import { cn } from '@/lib/ui/cn';

interface RecordingStatusProps {
  status: RecorderStatus;
  /** The Deepgram socket dropped and is being re-established mid-recording. */
  reconnecting: boolean;
}

/**
 * The recording indicator. Recording pulses slowly in red; Paused is a flat,
 * clearly different amber so it can't be mistaken for still recording
 * (PLAN.md section 6).
 */
export function RecordingStatus({ status, reconnecting }: RecordingStatusProps) {
  let label: string;
  let tone: string;
  let dot: string;

  if (reconnecting && status !== 'idle') {
    label = 'Reconnecting';
    tone = 'bg-warn/10 text-warn';
    dot = 'bg-warn animate-pulse-slow';
  } else if (status === 'recording') {
    label = 'Recording';
    tone = 'bg-error/10 text-error';
    dot = 'bg-error animate-pulse-slow';
  } else if (status === 'paused') {
    label = 'Paused';
    tone = 'bg-warn/10 text-warn';
    dot = 'bg-warn';
  } else {
    label = 'Ready';
    tone = 'bg-sunken text-fg-muted';
    dot = 'bg-line-strong';
  }

  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', tone)}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}
