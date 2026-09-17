'use client';

import { useEffect, useState } from 'react';

/** A ticking seconds counter that only advances while `isRunning` is true. */
export function useElapsedTimer(isRunning: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return elapsedSeconds;
}
