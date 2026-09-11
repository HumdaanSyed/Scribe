'use client';

import { useCallback } from 'react';
import { useRecorder } from '@/lib/hooks/useRecorder';
import { useTranscript } from '@/lib/hooks/useTranscript';
import { AudioLevelMeter } from '@/components/controls/AudioLevelMeter';

// TEMPORARY Phase 1/2 test harness. This route becomes the real Home/History
// screen (PLAN.md section 12) in Phase 6 — this content gets replaced then.
export default function Home() {
  const transcript = useTranscript();
  const recorder = useRecorder({ onPCMChunk: transcript.sendChunk });

  const handleStart = useCallback(async () => {
    await transcript.connect();
    const capturing = await recorder.start();
    if (!capturing) {
      // Mic capture failed (e.g. permission denied) — don't leave the
      // Deepgram socket open with nothing feeding it.
      transcript.disconnect();
    }
  }, [transcript, recorder]);

  const handleStop = useCallback(() => {
    recorder.stop();
    transcript.disconnect();
  }, [recorder, transcript]);

  const error = recorder.error ?? transcript.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          Phase 2 — Live transcription test
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Mic → AudioWorklet → Deepgram WebSocket. Speak and confirm text appears.
        </p>

        <div className="mt-6">
          <AudioLevelMeter level={recorder.level} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {recorder.status === 'idle' ? (
            <button
              onClick={handleStart}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Stop
            </button>
          )}
          <span className="font-mono text-xs uppercase tracking-wide text-gray-500">
            mic: {recorder.status} · deepgram: {transcript.connectionState}
          </span>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 min-h-[8rem] rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-900">
          {transcript.finalText || transcript.interimText ? (
            <p>
              {transcript.finalText}{' '}
              <span className="text-gray-400">{transcript.interimText}</span>
            </p>
          ) : (
            <p className="text-gray-400">Transcript will appear here…</p>
          )}
        </div>
      </div>
    </main>
  );
}
