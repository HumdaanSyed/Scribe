import { groupWordsIntoTurns } from './grouping';
import type { Speaker, SpeakerId, Word } from './model';

/** Formats a timestamp as a medium date + short time, e.g. "Sep 14, 2026, 6:04 PM". */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

/** Formats elapsed seconds as mm:ss (PLAN.md section 8). */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/**
 * Formats the transcript as plain speaker-labelled text for sending to the
 * model (PLAN.md section 9) — using each speaker's *current* display name,
 * one line per turn:
 *
 * [00:14] Alice: Let's start with the budget review.
 * [00:22] Bob: I've got the Q3 numbers here.
 */
export function formatTranscriptForModel(words: Word[], speakers: Record<SpeakerId, Speaker>): string {
  return groupWordsIntoTurns(words)
    .map((turn) => {
      const label = speakers[turn.speakerId]?.label ?? 'Unknown speaker';
      const timestamp = formatTimestamp(turn.words[0]?.start ?? 0);
      const text = turn.words.map((w) => w.text).join(' ');
      return `[${timestamp}] ${label}: ${text}`;
    })
    .join('\n');
}
