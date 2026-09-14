'use client';

import { useCallback } from 'react';
import { useRecorder } from '@/lib/hooks/useRecorder';
import { useTranscript } from '@/lib/hooks/useTranscript';
import { AudioLevelMeter } from '@/components/controls/AudioLevelMeter';
import { TranscriptView } from '@/components/transcript/TranscriptView';

// TEMPORARY Phase 1-4 test harness. This route becomes the real
// Home/History screen (PLAN.md section 12) in Phase 6 — this content gets
// replaced then.
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

  const handlePause = useCallback(() => {
    recorder.pause();
    transcript.pause();
  }, [recorder, transcript]);

  const handleResume = useCallback(() => {
    recorder.resume();
    transcript.resume();
  }, [recorder, transcript]);

  const handleStop = useCallback(() => {
    recorder.stop();
    transcript.disconnect();
  }, [recorder, transcript]);

  const error = recorder.error ?? transcript.error;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8">
      <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">Phase 4 — Pause / resume test</h1>
          {recorder.status === 'paused' && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700">
              Paused
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Start, speak, Pause, wait a bit, Resume, speak again — the transcript should stay
          continuous with the same speaker labels.
        </p>

        <div className="mt-6">
          <AudioLevelMeter level={recorder.level} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          {recorder.status === 'idle' && (
            <button
              onClick={handleStart}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start
            </button>
          )}
          {recorder.status === 'recording' && (
            <>
              <button
                onClick={handlePause}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Pause
              </button>
              <button
                onClick={handleStop}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Stop
              </button>
            </>
          )}
          {recorder.status === 'paused' && (
            <>
              <button
                onClick={handleResume}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Resume
              </button>
              <button
                onClick={handleStop}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Stop
              </button>
            </>
          )}
          <span className="font-mono text-xs uppercase tracking-wide text-gray-500">
            mic: {recorder.status} · deepgram: {transcript.connectionState}
          </span>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          <TranscriptView
            words={transcript.words}
            speakers={transcript.speakers}
            boundaries={transcript.boundaries}
            interimText={transcript.interimText}
            onRenameSpeaker={transcript.renameSpeaker}
          />
        </div>
      </div>
    </main>
  );
}
