'use client';

import { useRecorder } from '@/lib/hooks/useRecorder';
import { AudioLevelMeter } from '@/components/controls/AudioLevelMeter';

// TEMPORARY Phase 1 test harness. This route becomes the real Home/History
// screen (PLAN.md section 12) in Phase 6 — this content gets replaced then.
export default function Home() {
  const { status, level, error, start, stop } = useRecorder();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-8">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Phase 1 — Audio pipeline test</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mic → AudioContext → AudioWorklet → PCM16. Speak and confirm the meter moves.
        </p>

        <div className="mt-6">
          <AudioLevelMeter level={level} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {status === 'idle' ? (
            <button
              onClick={start}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start mic capture
            </button>
          ) : (
            <button
              onClick={stop}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Stop
            </button>
          )}
          <span className="font-mono text-xs uppercase tracking-wide text-gray-500">
            {status}
          </span>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
