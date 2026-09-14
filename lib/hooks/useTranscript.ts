'use client';

import { useCallback, useRef, useState } from 'react';
import {
  type DeepgramResultsMessage,
  openDeepgramConnection,
  sendAudioChunk,
} from '@/lib/deepgram/connection';
import type { Speaker, SpeakerId, Word } from '@/lib/transcript/model';

export type TranscriptConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

interface TranscriptState {
  connectionState: TranscriptConnectionState;
  words: Word[];
  speakers: Record<SpeakerId, Speaker>;
  /** Ephemeral in-progress text, replaced wholesale on each interim message. */
  interimText: string;
  error: string | null;
}

// Caps how much audio we'll buffer if the socket never opens (bad token,
// network issue) — otherwise a long recording against a broken connection
// accumulates PCM data in memory forever. ~13s at one ~256ms chunk each,
// comfortably more than a normal connect takes.
const MAX_PENDING_CHUNKS = 50;

const initialState: TranscriptState = {
  connectionState: 'idle',
  words: [],
  speakers: {},
  interimText: '',
  error: null,
};

/**
 * Maps Deepgram's per-connection integer speaker index to a stable app
 * SpeakerId (PLAN.md section 7). Phase 4 offsets this after a reconnect so
 * indices from a new connection never collide with speakers already seen.
 */
function speakerIdForIndex(index: number): SpeakerId {
  return `spk_${index}`;
}

export function useTranscript() {
  const [state, setState] = useState<TranscriptState>(initialState);

  const socketRef = useRef<WebSocket | null>(null);
  // Chunks captured while the socket is still connecting get sent once it opens.
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);

  const handleResults = useCallback((message: DeepgramResultsMessage) => {
    const alternative = message.channel.alternatives[0];
    const transcript = alternative?.transcript ?? '';

    if (!message.is_final) {
      // Always apply interim text, even empty — Deepgram can retract an
      // in-progress hypothesis, and the ephemeral buffer should reflect that
      // instead of leaving stale text on screen.
      setState((s) => ({ ...s, interimText: transcript }));
      return;
    }

    const newWords = alternative?.words ?? [];
    if (newWords.length === 0) return;

    setState((s) => {
      // Never denormalize a speaker's display name onto a word — words
      // store only speakerId, so renaming stays a single-field mutation.
      const speakers = { ...s.speakers };
      let nextOrdinal = Object.keys(speakers).length;

      const words: Word[] = newWords.map((w) => {
        const speakerId = speakerIdForIndex(w.speaker ?? 0);
        if (!speakers[speakerId]) {
          speakers[speakerId] = {
            id: speakerId,
            label: `Speaker ${nextOrdinal + 1}`,
            colorIndex: nextOrdinal,
          };
          nextOrdinal += 1;
        }
        return { text: w.punctuated_word || w.word, start: w.start, end: w.end, speakerId };
      });

      return { ...s, words: [...s.words, ...words], speakers, interimText: '' };
    });
  }, []);

  const renameSpeaker = useCallback((speakerId: SpeakerId, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setState((s) =>
      s.speakers[speakerId]
        ? {
            ...s,
            speakers: { ...s.speakers, [speakerId]: { ...s.speakers[speakerId], label: trimmed } },
          }
        : s,
    );
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connectionState: 'connecting', error: null }));

    try {
      const socket = await openDeepgramConnection({
        onOpen: () => {
          // Ignore late events from a socket that disconnect()/a newer
          // connect() has already superseded — otherwise a stale connection
          // can resurrect old state or send buffered audio to the wrong socket.
          if (socketRef.current !== socket) return;
          setState((s) => ({ ...s, connectionState: 'open' }));
          for (const chunk of pendingChunksRef.current) {
            sendAudioChunk(socket, chunk);
          }
          pendingChunksRef.current = [];
        },
        onResults: handleResults,
        onError: () => {
          if (socketRef.current !== socket) return;
          setState((s) => ({
            ...s,
            connectionState: 'error',
            error: 'Deepgram connection error.',
          }));
        },
        onClose: () => {
          if (socketRef.current !== socket) return;
          setState((s) => (s.connectionState === 'error' ? s : { ...s, connectionState: 'closed' }));
        },
      });

      socketRef.current = socket;
    } catch (err) {
      setState((s) => ({
        ...s,
        connectionState: 'error',
        error: err instanceof Error ? err.message : 'Could not connect to Deepgram.',
      }));
    }
  }, [handleResults]);

  const sendChunk = useCallback((chunk: ArrayBuffer) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendAudioChunk(socket, chunk);
    } else {
      pendingChunksRef.current.push(chunk);
      if (pendingChunksRef.current.length > MAX_PENDING_CHUNKS) {
        pendingChunksRef.current.shift();
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    pendingChunksRef.current = [];
    setState((s) => ({ ...s, connectionState: 'idle' }));
  }, []);

  return { ...state, connect, disconnect, sendChunk, renameSpeaker };
}
