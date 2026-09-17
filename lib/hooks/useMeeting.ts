'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecorder } from './useRecorder';
import { useTranscript } from './useTranscript';
import { useElapsedTimer } from './useElapsedTimer';
import { getMeeting, saveMeeting } from '@/lib/storage/meetings';
import type {
  ChatMessage,
  Meeting,
  SessionBoundary,
  Speaker,
  SpeakerId,
  Word,
} from '@/lib/transcript/model';

export type MeetingMode = 'loading' | 'live' | 'review';

const AUTOSAVE_INTERVAL_MS = 10_000;

function defaultTitle(createdAt: number): string {
  return new Date(createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

/** Builds the full persisted shape from the id plus the fields that vary by call site. */
function buildMeetingSnapshot(
  meetingId: string,
  fields: {
    title: string;
    createdAt: number;
    durationSeconds: number;
    words: Word[];
    speakers: Record<SpeakerId, Speaker>;
    boundaries: SessionBoundary[];
    summary: string | null;
    chatHistory: ChatMessage[];
  },
): Meeting {
  return { id: meetingId, ...fields };
}

/**
 * Orchestrates one meeting: a brand-new id starts in 'live' mode (recorder +
 * live transcript, autosaving every ~10s while recording); an id already in
 * IndexedDB loads directly into read-only 'review' mode (PLAN.md section 11
 * — "same route, mode by state").
 */
export function useMeeting(meetingId: string) {
  const transcript = useTranscript();
  const recorder = useRecorder({ onPCMChunk: transcript.sendChunk });

  const [mode, setMode] = useState<MeetingMode>('loading');
  const [title, setTitle] = useState('');
  const [createdAt, setCreatedAt] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);

  // Review-mode display state — a locally-editable copy of what was loaded
  // from (or, after Stop, just written to) IndexedDB.
  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [reviewSpeakers, setReviewSpeakers] = useState<Record<SpeakerId, Speaker>>({});
  const [reviewBoundaries, setReviewBoundaries] = useState<SessionBoundary[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  // Set by any failed IndexedDB read/write below, so the UI has something
  // to show instead of failing silently.
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const elapsedSeconds = useElapsedTimer(recorder.status === 'recording');
  const durationSeconds = mode === 'review' ? loadedDuration : elapsedSeconds;

  /** Saves a snapshot, clearing/setting persistenceError on success/failure. */
  const persistSnapshot = useCallback(async (snapshot: Meeting, errorPrefix: string) => {
    try {
      await saveMeeting(snapshot);
      setPersistenceError(null);
    } catch (err) {
      setPersistenceError(err instanceof Error ? `${errorPrefix}: ${err.message}` : errorPrefix);
    }
  }, []);

  // Load an existing meeting, or start a fresh one, whenever the route's id
  // changes. `mode` starts at 'loading' via its initial state above — in
  // this app a different id always means a freshly-mounted page (Home is
  // the only way to navigate between meetings), so there's no stale-mode
  // case to reset synchronously here.
  useEffect(() => {
    let cancelled = false;

    getMeeting(meetingId)
      .then((existing) => {
        if (cancelled) return;

        if (existing) {
          setTitle(existing.title);
          setCreatedAt(existing.createdAt);
          setLoadedDuration(existing.durationSeconds);
          setReviewWords(existing.words);
          setReviewSpeakers(existing.speakers);
          setReviewBoundaries(existing.boundaries);
          setSummary(existing.summary);
          setChatHistory(existing.chatHistory);
          setMode('review');
        } else {
          const now = Date.now();
          setTitle(defaultTitle(now));
          setCreatedAt(now);
          setMode('live');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // Couldn't tell whether this meeting already exists — fall back to
        // a fresh live session rather than leaving the page stuck on
        // 'loading' forever.
        const now = Date.now();
        setTitle(defaultTitle(now));
        setCreatedAt(now);
        setPersistenceError(
          err instanceof Error ? `Could not load this meeting: ${err.message}` : 'Could not load this meeting.',
        );
        setMode('live');
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  // Autosave reads through a ref so the interval itself doesn't get torn
  // down and recreated on every word — only when recording actually
  // starts/stops — while still always writing the latest data. Synced in an
  // effect (not during render) since refs are only safe to write outside of it.
  const latestRef = useRef({
    title,
    createdAt,
    elapsedSeconds,
    words: transcript.words,
    speakers: transcript.speakers,
    boundaries: transcript.boundaries,
  });
  useEffect(() => {
    latestRef.current = {
      title,
      createdAt,
      elapsedSeconds,
      words: transcript.words,
      speakers: transcript.speakers,
      boundaries: transcript.boundaries,
    };
  });

  useEffect(() => {
    if (mode !== 'live' || recorder.status !== 'recording') return;

    const interval = setInterval(() => {
      const latest = latestRef.current;
      void saveMeeting(
        buildMeetingSnapshot(meetingId, {
          title: latest.title,
          createdAt: latest.createdAt,
          durationSeconds: latest.elapsedSeconds,
          words: latest.words,
          speakers: latest.speakers,
          boundaries: latest.boundaries,
          summary: null,
          chatHistory: [],
        }),
      );
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [mode, recorder.status, meetingId]);

  // Safety net: stop the mic and close the socket if the user navigates
  // away mid-recording instead of clicking Stop.
  const recorderRef = useRef(recorder);
  const transcriptRef = useRef(transcript);
  useEffect(() => {
    recorderRef.current = recorder;
    transcriptRef.current = transcript;
  });

  useEffect(() => {
    return () => {
      if (recorderRef.current.status !== 'idle') {
        recorderRef.current.stop();
        transcriptRef.current.disconnect();
      }
    };
  }, []);

  const stop = useCallback(async () => {
    recorder.stop();
    transcript.disconnect();

    const latest = latestRef.current;
    const finalMeeting = buildMeetingSnapshot(meetingId, {
      title: latest.title,
      createdAt: latest.createdAt,
      durationSeconds: latest.elapsedSeconds,
      words: latest.words,
      speakers: latest.speakers,
      boundaries: latest.boundaries,
      summary: null,
      chatHistory: [],
    });
    // Show what was captured either way — a failed write shouldn't leave
    // the user stuck on the live screen with no way forward; persistSnapshot
    // surfaces the failure via persistenceError instead.
    await persistSnapshot(finalMeeting, 'Could not save this meeting');

    setLoadedDuration(finalMeeting.durationSeconds);
    setReviewWords(finalMeeting.words);
    setReviewSpeakers(finalMeeting.speakers);
    setReviewBoundaries(finalMeeting.boundaries);
    setSummary(finalMeeting.summary);
    setChatHistory(finalMeeting.chatHistory);
    setMode('review');
  }, [recorder, transcript, meetingId, persistSnapshot]);

  const renameTitle = useCallback(
    (newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      setTitle(trimmed);

      // In live mode, the next autosave tick (or Stop) picks up the new
      // title via latestRef — no need to force a write while nothing may
      // even be persisted yet.
      if (mode === 'review') {
        void persistSnapshot(
          buildMeetingSnapshot(meetingId, {
            title: trimmed,
            createdAt,
            durationSeconds: loadedDuration,
            words: reviewWords,
            speakers: reviewSpeakers,
            boundaries: reviewBoundaries,
            summary,
            chatHistory,
          }),
          'Could not save the rename',
        );
      }
    },
    [
      mode,
      meetingId,
      createdAt,
      loadedDuration,
      reviewWords,
      reviewSpeakers,
      reviewBoundaries,
      summary,
      chatHistory,
      persistSnapshot,
    ],
  );

  const renameSpeaker = useCallback(
    (speakerId: SpeakerId, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;

      if (mode === 'live') {
        transcript.renameSpeaker(speakerId, trimmed);
        return;
      }

      setReviewSpeakers((prev) => {
        if (!prev[speakerId]) return prev;
        const next = { ...prev, [speakerId]: { ...prev[speakerId], label: trimmed } };
        void persistSnapshot(
          buildMeetingSnapshot(meetingId, {
            title,
            createdAt,
            durationSeconds: loadedDuration,
            words: reviewWords,
            speakers: next,
            boundaries: reviewBoundaries,
            summary,
            chatHistory,
          }),
          'Could not save the rename',
        );
        return next;
      });
    },
    [
      mode,
      transcript,
      meetingId,
      title,
      createdAt,
      loadedDuration,
      reviewWords,
      reviewBoundaries,
      summary,
      chatHistory,
      persistSnapshot,
    ],
  );

  // Summary/Q&A are review-only features (PLAN.md section 12) — both just
  // update local state and persist immediately, the same pattern as rename.
  const updateSummary = useCallback(
    (newSummary: string) => {
      setSummary(newSummary);
      void persistSnapshot(
        buildMeetingSnapshot(meetingId, {
          title,
          createdAt,
          durationSeconds: loadedDuration,
          words: reviewWords,
          speakers: reviewSpeakers,
          boundaries: reviewBoundaries,
          summary: newSummary,
          chatHistory,
        }),
        'Could not save the summary',
      );
    },
    [
      meetingId,
      title,
      createdAt,
      loadedDuration,
      reviewWords,
      reviewSpeakers,
      reviewBoundaries,
      chatHistory,
      persistSnapshot,
    ],
  );

  const updateChatHistory = useCallback(
    (newHistory: ChatMessage[]) => {
      setChatHistory(newHistory);
      void persistSnapshot(
        buildMeetingSnapshot(meetingId, {
          title,
          createdAt,
          durationSeconds: loadedDuration,
          words: reviewWords,
          speakers: reviewSpeakers,
          boundaries: reviewBoundaries,
          summary,
          chatHistory: newHistory,
        }),
        'Could not save the chat',
      );
    },
    [
      meetingId,
      title,
      createdAt,
      loadedDuration,
      reviewWords,
      reviewSpeakers,
      reviewBoundaries,
      summary,
      persistSnapshot,
    ],
  );

  return {
    mode,
    title,
    createdAt,
    durationSeconds,
    persistenceError,
    renameTitle,
    recorder,
    transcript,
    stop,
    // Review-mode display data (words/speakers/boundaries come from
    // `transcript` directly while live).
    reviewWords,
    reviewSpeakers,
    reviewBoundaries,
    summary,
    chatHistory,
    renameSpeaker,
    updateSummary,
    updateChatHistory,
  };
}
