'use client';

import { useCallback, useRef, useState } from 'react';
import { getMicStream, stopStream } from '@/lib/audio/capture';
import { createAudioContext, mixStreams } from '@/lib/audio/mixer';
import { AUDIO_PROCESSOR_NAME, loadAudioWorklet } from '@/lib/audio/worklet-loader';

// Phase 1 only knows idle/recording. Phase 4 adds 'paused'.
export type RecorderStatus = 'idle' | 'recording';

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

interface UseRecorderOptions {
  /** Called with each raw PCM16 chunk as it arrives, e.g. to forward it to Deepgram. */
  onPCMChunk?: (chunk: ArrayBuffer) => void;
}

export function useRecorder({ onPCMChunk }: UseRecorderOptions = {}) {
  const [state, setState] = useState<RecorderState>(initialState);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  // Kept in a ref so the worklet's onmessage handler (bound once, at start)
  // always calls the latest callback without needing to be re-created.
  const onPCMChunkRef = useRef(onPCMChunk);
  onPCMChunkRef.current = onPCMChunk;

  const stop = useCallback(() => {
    workletNodeRef.current?.port.close();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    stopStream(micStreamRef.current);
    micStreamRef.current = null;

    setState((s) => ({ ...s, status: 'idle', level: 0 }));
  }, []);

  /** Returns whether capture actually started, so callers can react (e.g. tear down a Deepgram connection opened in parallel). */
  const start = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, error: null }));

    try {
      const micStream = await getMicStream();
      micStreamRef.current = micStream;

      const audioContext = createAudioContext();
      audioContextRef.current = audioContext;
      await loadAudioWorklet(audioContext);

      // Route mic → mixer destination → worklet. A no-op today (single
      // source), but it's the same path Phase 5 mixes tab audio into.
      const { destination } = mixStreams(audioContext, [micStream]);
      const mixedSource = audioContext.createMediaStreamSource(destination.stream);

      const workletNode = new AudioWorkletNode(audioContext, AUDIO_PROCESSOR_NAME);
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const pcm16 = new Int16Array(event.data);
        setState((s) => ({ ...s, level: rms(pcm16) }));
        onPCMChunkRef.current?.(event.data);
      };

      mixedSource.connect(workletNode);
      // The processor never writes to its output (stays silent), but the
      // node still needs a path to the destination to keep being pulled
      // by the audio graph's rendering quantum.
      workletNode.connect(audioContext.destination);

      setState((s) => ({ ...s, status: 'recording' }));
      return true;
    } catch (err) {
      stop();
      setState((s) => ({
        ...s,
        status: 'idle',
        error: err instanceof Error ? err.message : 'Could not start microphone capture.',
      }));
      return false;
    }
  }, [stop]);

  return { ...state, start, stop };
}
