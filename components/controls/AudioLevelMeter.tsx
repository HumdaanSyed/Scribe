'use client';

interface AudioLevelMeterProps {
  /** 0..1 */
  level: number;
}

export function AudioLevelMeter({ level }: AudioLevelMeterProps) {
  const percent = Math.round(Math.min(1, Math.max(0, level)) * 100);

  return (
    <div className="w-full">
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-75 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-xs text-gray-500">{percent}%</p>
    </div>
  );
}
