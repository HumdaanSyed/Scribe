'use client';

interface AudioLevelMeterProps {
  /** Raw RMS level, 0..1. */
  level: number;
}

export function AudioLevelMeter({ level }: AudioLevelMeterProps) {
  // Speech RMS sits low (~0.05–0.2), so a square-root curve keeps quiet
  // talking visibly moving the bar instead of barely twitching it.
  const fill = Math.min(1, Math.sqrt(Math.max(0, level)) * 1.5);
  const percent = Math.round(fill * 100);

  return (
    <div
      role="meter"
      aria-label="Input level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-100 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
