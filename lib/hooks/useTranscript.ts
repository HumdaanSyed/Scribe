'use client';

import { useCallback, useRef, useState } from 'react';
import {
  type DeepgramResultsMessage,
  openDeepgramConnection,
  sendAudioChunk,
} from '@/lib/deepgram/connection';
import { startKeepAlive } from '@/lib/deepgram/keepalive';
import type { SessionBoundary, Speaker, SpeakerId, Word } from '@/lib/transcript/model';

export type TranscriptConnectionState =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'error';

interface TranscriptState {
  connectionState: TranscriptConnectionState;
  words: Word[];
  speakers: Record<SpeakerId, Speaker>;
  boundaries: SessionBoundary[];
  /** Ephemeral in-progress text, replaced wholesale on each interim message. */
  interimText: string;
  error: string | null;
}

// Caps how much audio we'll buffer if the socket never opens (bad token,
// network issue) — otherwise a long recording against a broken connection
// accumulates PCM data in memory forever. ~13s at one ~256ms chunk each,
// comfortably more than a normal connect takes.
const MAX_PENDING_CHUNKS = 50;

// Give up auto-reconnecting after this many consecutive unexpected drops,
// rather than hammering the token endpoint forever against a hard failure.
const MAX_RECONNECT_ATTEMPTS = 3;

const RECONNECT_BOUNDARY_REASON = 'Recording resumed — speaker labels may need remapping below';

const initialState: TranscriptState = {
  connectionState: 'idle',
  words: [],
  speakers: {},
  boundaries: [],
  interimText: '',
  error: null,
};

/** Maps an (offset-adjusted) speaker index to a stable app SpeakerId. */
function speakerIdForIndex(index: number): SpeakerId {
  return `spk_${index}`;
}

export function useTranscript() {
  const [state, setState] = useState<TranscriptState>(initialState);

  const socketRef = useRef<WebSocket | null>(null);
  // Chunks captured while the socket is still connecting get sent once it opens.
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);

  // Highest *effective* (already offset-adjusted) speaker index seen so
  // far. After an unexpected reconnect, the next connection's raw indices
  // are offset past this so a "speaker 0" on the new socket never collides
  // with one already on screen (PLAN.md section 6).
  const maxSpeakerIndexSeenRef = useRef(-1);
  const speakerIndexOffsetRef = useRef(0);
  // Deepgram's word timestamps are relative to each connection's own start.
  // After a reconnect they'd otherwise jump back to ~0 — offset new words
  // by the last committed word's end time so the transcript stays monotonic.
  const wordTimeOffsetRef = useRef(0);
  const lastWordEndRef = useRef(0);

  // True once the user has explicitly stopped — distinguishes a deliberate
  // close from an unexpected drop that should trigger the reconnect fallback.
  const intentionalCloseRef = useRef(false);
  // Mirrors the pause/resume UI state, so a reconnect that happens mid-pause
  // starts KeepAlive on the new socket too instead of leaving it silent.
  const pausedRef = useRef(false);
  const stopKeepAliveRef = useRef<(() => void) | null>(null);
  const reconnectAttemptsRef = useRef(0);

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

    const timeOffset = wordTimeOffsetRef.current;
    lastWordEndRef.current = timeOffset + newWords[newWords.length - 1].end;

    setState((s) => {
      // Never denormalize a speaker's display name onto a word — words
      // store only speakerId, so renaming stays a single-field mutation.
      const speakers = { ...s.speakers };
      let nextOrdinal = Object.keys(speakers).length;

      const words: Word[] = newWords.map((w) => {
        const effectiveIndex = speakerIndexOffsetRef.current + (w.speaker ?? 0);
        maxSpeakerIndexSeenRef.current = Math.max(maxSpeakerIndexSeenRef.current, effectiveIndex);

        const speakerId = speakerIdForIndex(effectiveIndex);
        if (!speakers[speakerId]) {
          speakers[speakerId] = {
            id: speakerId,
            label: `Speaker ${nextOrdinal + 1}`,
            colorIndex: nextOrdinal,
          };
          nextOrdinal += 1;
        }
        return {
          text: w.punctuated_word || w.word,
          start: w.start + timeOffset,
          end: w.end + timeOffset,
          speakerId,
        };
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

  const connectSocket = useCallback(
    async (isReconnect: boolean) => {
      setState((s) => ({
        ...s,
        connectionState: isReconnect ? 'reconnecting' : 'connecting',
        error: null,
      }));

      try {
        const socket = await openDeepgramConnection({
          onOpen: () => {
            // Ignore late events from a socket that disconnect()/a newer
            // connect() has already superseded — otherwise a stale
            // connection can resurrect old state or send buffered audio to
            // the wrong socket.
            if (socketRef.current !== socket) return;
            reconnectAttemptsRef.current = 0;
            setState((s) => ({ ...s, connectionState: 'open' }));
            for (const chunk of pendingChunksRef.current) {
              sendAudioChunk(socket, chunk);
            }
            pendingChunksRef.current = [];
            // A reconnect that lands while still "paused" needs its own
            // KeepAlive — the old socket's interval died with it.
            if (pausedRef.current && !stopKeepAliveRef.current) {
              stopKeepAliveRef.current = startKeepAlive(socket);
            }
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
            stopKeepAliveRef.current?.();
            stopKeepAliveRef.current = null;

            if (intentionalCloseRef.current) {
              setState((s) => (s.connectionState === 'error' ? s : { ...s, connectionState: 'closed' }));
              return;
            }

            if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
              socketRef.current = null;
              setState((s) => ({
                ...s,
                connectionState: 'error',
                error: 'Lost the Deepgram connection and could not reconnect. Stop and start again.',
              }));
              return;
            }

            // Unexpected drop (a pause that outlasted KeepAlive, a network
            // blip, a Deepgram timeout) — don't silently renumber speakers
            // or reset the clock; offset both, mark a boundary, and
            // reconnect rather than losing continuity (PLAN.md section 6).
            reconnectAttemptsRef.current += 1;
            socketRef.current = null;
            speakerIndexOffsetRef.current = maxSpeakerIndexSeenRef.current + 1;
            wordTimeOffsetRef.current = lastWordEndRef.current;

            setState((s) => ({
              ...s,
              boundaries: [
                ...s.boundaries,
                { afterWordIndex: s.words.length, reason: RECONNECT_BOUNDARY_REASON },
              ],
            }));

            void connectSocket(true);
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
    },
    [handleResults],
  );

  const connect = useCallback(async () => {
    intentionalCloseRef.current = false;
    pausedRef.current = false;
    maxSpeakerIndexSeenRef.current = -1;
    speakerIndexOffsetRef.current = 0;
    wordTimeOffsetRef.current = 0;
    lastWordEndRef.current = 0;
    reconnectAttemptsRef.current = 0;
    await connectSocket(false);
  }, [connectSocket]);

  /** Stops forwarding audio but keeps the socket alive via KeepAlive (PLAN.md section 6). */
  const pause = useCallback(() => {
    pausedRef.current = true;
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && !stopKeepAliveRef.current) {
      stopKeepAliveRef.current = startKeepAlive(socket);
    }
  }, []);

  /** Resumes forwarding audio on the same connection — speaker indices stay continuous. */
  const resume = useCallback(() => {
    pausedRef.current = false;
    stopKeepAliveRef.current?.();
    stopKeepAliveRef.current = null;
  }, []);

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
    intentionalCloseRef.current = true;
    pausedRef.current = false;
    stopKeepAliveRef.current?.();
    stopKeepAliveRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
    pendingChunksRef.current = [];
    setState((s) => ({ ...s, connectionState: 'idle' }));
  }, []);

  return { ...state, connect, disconnect, pause, resume, sendChunk, renameSpeaker };
}
