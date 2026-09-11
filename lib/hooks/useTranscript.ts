'use client';

import { useCallback, useRef, useState } from 'react';
import {
  type DeepgramResultsMessage,
  openDeepgramConnection,
  sendAudioChunk,
} from '@/lib/deepgram/connection';

export type TranscriptConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

interface TranscriptState {
  connectionState: TranscriptConnectionState;
  /** Committed text from is_final results, space-joined. Phase 3 replaces this with word-level speaker turns. */
  finalText: string;
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
  finalText: '',
  interimText: '',
  error: null,
};

export function useTranscript() {
  const [state, setState] = useState<TranscriptState>(initialState);

  const socketRef = useRef<WebSocket | null>(null);
  // Chunks captured while the socket is still connecting get sent once it opens.
  const pendingChunksRef = useRef<ArrayBuffer[]>([]);

  const handleResults = useCallback((message: DeepgramResultsMessage) => {
    const transcript = message.channel.alternatives[0]?.transcript ?? '';

    if (message.is_final) {
      // An empty final adds nothing — skip it rather than appending a stray space.
      if (!transcript) return;
      setState((s) => ({
        ...s,
        finalText: s.finalText ? `${s.finalText} ${transcript}` : transcript,
        interimText: '',
      }));
    } else {
      // Always apply interim text, even empty — Deepgram can retract an
      // in-progress hypothesis, and the ephemeral buffer should reflect that
      // instead of leaving stale text on screen.
      setState((s) => ({ ...s, interimText: transcript }));
    }
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

  return { ...state, connect, disconnect, sendChunk };
}
