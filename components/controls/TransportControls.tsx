'use client';

import { Button } from '@/components/ui/Button';
import type { RecorderStatus } from '@/lib/hooks/useRecorder';

interface TransportControlsProps {
  status: RecorderStatus;
  isStarting: boolean;
  /** At least one audio source is enabled. */
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/** Record → Pause/Resume → Stop (PLAN.md section 6's three-state machine, plus a separate Stop). */
export function TransportControls({
  status,
  isStarting,
  canStart,
  onStart,
  onPause,
  onResume,
  onStop,
}: TransportControlsProps) {
  if (status === 'idle') {
    return (
      <Button variant="primary" onClick={onStart} disabled={!canStart || isStarting}>
        {isStarting ? 'Starting…' : 'Record'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'recording' ? (
        <Button variant="secondary" onClick={onPause}>
          Pause
        </Button>
      ) : (
        <Button variant="primary" onClick={onResume}>
          Resume
        </Button>
      )}
      <Button variant="secondary" onClick={onStop}>
        Stop
      </Button>
    </div>
  );
}
