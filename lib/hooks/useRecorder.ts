'use client';

import { useCallback, useRef, useState } from 'react';
import { getDisplayAudioStream, getMicStream, stopStream } from '@/lib/audio/capture';
import { createAudioContext, mixStreams } from '@/lib/audio/mixer';
import { AUDIO_PROCESSOR_NAME, loadAudioWorklet } from '@/lib/audio/worklet-loader';

export type RecorderStatus = 'idle' | 'recording' | 'paused';

interface RecorderState {
  status: RecorderStatus;
  /** RMS of the most recent PCM16 chunk, normalized to 0..1, for the level meter. */
  level: number;
  error: string | null;
}

const initialState: RecorderState = { status: 'idle', level: 0, error: null };

function rms(pcm16: Int16Array): number {
  if (pcm16.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < pcm16.length; i++) {
    const normalized = pcm16[i] / 0x7fff;
    sumSquares += normalized * normalized;
  }
  return Math.sqrt(sumSquares / pcm16.length);
}

export interface StartSources {
  mic: boolean;
  systemAudio: boolean;
}

export interface StartResult {
  started: boolean;
  /** Set when system audio was requested but couldn't be captured — mic (if requested) may still be running. */
  systemAudioError?: string;
}

interface UseRecorderOptions {
  /** Called with each raw PCM16 chunk as it arrives, e.g. to forward it to Deepgram. */
  onPCMChunk?: (chunk: ArrayBuffer) => void;
}

export function useRecorder({ onPCMChunk }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>(initialState);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  // All acquired sources (mic and/or system audio) — tracked together so
  // every track gets stopped on teardown, whichever combination was used
  // (PLAN.md section 4).
  const streamsRef = useRef<MediaStream[]>([]);
  // Kept in a ref so the worklet's onmessage handler (bound once, at start)
  // always calls the latest callback without needing to be re-created.
  const onPCMChunkRef = useRef(onPCMChunk);
  onPCMChunkRef.current = onPCMChunk;
  // Guards against a double-click starting two concurrent capture setups —
  // the getUserMedia permission prompt is non-modal, so the page (and the
  // still-idle Start button) stays clickable while it's up.
  const startingRef = useRef(false);
  // Belt-and-suspenders alongside AudioContext.suspend() — that alone
  // should stop the worklet's process() from being called, but this makes
  // sure a stray late message never gets forwarded while paused.
  const isPausedRef = useRef(false);
  // stop() calling track.stop() also fires each track's 'ended' event —
  // this distinguishes that expected case from a track ending on its own
  // (e.g. the user clicks Chrome's native "Stop sharing" control) so we
  // only surface the latter as an error.
  const intentionalStopRef = useRef(false);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;

    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    streamsRef.current.forEach(stopStream);
    streamsRef.current = [];

    isPausedRef.current = false;
    setState((s) => ({ ...s, status: 'idle', level: 0 }));
  }, []);

  /**
   * Surfaces a clear error if a captured source ends on its own mid-session
   * — e.g. the user clicks Chrome's native "Stop sharing" control for a
   * shared tab — instead of silently continuing to "record" without it.
   */
  const watchForUnexpectedEnd = useCallback((stream: MediaStream, sourceLabel: string) => {
    stream.getTracks().forEach((track) => {
      track.addEventListener(
        'ended',
        () => {
          if (intentionalStopRef.current) return;
          setState((s) => ({ ...s, error: `${sourceLabel} stopped unexpectedly.` }));
        },
        { once: true },
      );
    });
  }, []);

  /**
   * Suspends the AudioContext and stops forwarding audio, but keeps the
   * media tracks live so resume is instant and the OS permission prompt
   * doesn't reappear (PLAN.md section 6).
   */
  const pause = useCallback(() => {
    isPausedRef.current = true;
    audioContextRef.current?.suspend().catch(() => {});
    setState((s) => (s.status === 'recording' ? { ...s, status: 'paused', level: 0 } : s));
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    audioContextRef.current?.resume().catch(() => {});
    setState((s) => (s.status === 'paused' ? { ...s, status: 'recording' } : s));
  }, []);

  /** Returns whether capture actually started, so callers can react (e.g. tear down a Deepgram connection opened in parallel). */
  const start = useCallback(async (sources: StartSources): Promise<StartResult> => {
    if (startingRef.current) return { started: false };
    startingRef.current = true;
    isPausedRef.current = false;
    intentionalStopRef.current = false;
    setState((s) => ({ ...s, error: null }));

    const streams: MediaStream[] = [];
    let systemAudioError: string | undefined;

    try {
      if (sources.mic) {
        try {
          const micStream = await getMicStream();
          streams.push(micStream);
          watchForUnexpectedEnd(micStream, 'Microphone');
        } catch (err) {
          // Mic is the explicitly-requested primary source — its failure
          // is fatal, unlike system audio below.
          setState((s) => ({
            ...s,
            status: 'idle',
            error: err instanceof Error ? err.message : 'Could not start microphone capture.',
          }));
          return { started: false };
        }
      }

      if (sources.systemAudio) {
        try {
          const displayStream = await getDisplayAudioStream();
          streams.push(displayStream);
          watchForUnexpectedEnd(displayStream, 'System audio');
        } catch (err) {
          // Don't let system audio failing (cancelled picker, shared a
          // window instead of a tab, forgot "Share tab audio") sink an
          // already-working mic capture — surface it and continue with
          // whatever source(s) succeeded (PLAN.md section 4).
          systemAudioError = err instanceof Error ? err.message : 'Could not capture system audio.';
        }
      }

      if (streams.length === 0) {
        setState((s) => ({
          ...s,
          status: 'idle',
          error: systemAudioError ?? 'No audio source was captured.',
        }));
        return { started: false, systemAudioError };
      }

      streamsRef.current = streams;

      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;
      await loadAudioWorklet(audioContext);

      // Web Audio sums every source into one signal — this is the mixing.
      const { destination } = mixStreams(audioContext, streams);
      const mixedSource = audioContext.createMediaStreamSource(destination.stream);

      const workletNode = new AudioWorkletNode(audioContext, AUDIO_PROCESSOR_NAME);
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (isPausedRef.current) return;
        const pcm16 = new Int16Array(event.data);
        setState((s) => ({ ...s, level: rms(pcm16) }));
        onPCMChunkRef.current?.(event.data);
      };

      mixedSource.connect(workletNode);
      // The processor never writes to its output (stays silent), but the
      // node still needs a path to the destination to keep being pulled
      // by the audio graph's rendering quantum.
      workletNode.connect(audioContext.destination);

      setState((s) => ({ ...s, status: 'recording', error: systemAudioError ?? null }));
      return { started: true, systemAudioError };
    } catch (err) {
      stop();
      setState((s) => ({
        ...s,
        status: 'idle',
        error: err instanceof Error ? err.message : 'Could not start audio capture.',
      }));
      return { started: false };
    } finally {
      startingRef.current = false;
    }
  }, [stop, watchForUnexpectedEnd]);

  return { ...state, start, stop, pause, resume };
}
