'use client';

import { useEffect, useRef, useState } from 'react';
import type { SessionBoundary, Speaker, SpeakerId, Word } from '@/lib/transcript/model';
import { groupWordsIntoTurns } from '@/lib/transcript/grouping';
import { Turn } from './Turn';
import { InterimText } from './InterimText';
import { SessionBoundaryMarker } from './SessionBoundaryMarker';

interface TranscriptViewProps {
  words: Word[];
  speakers: Record<SpeakerId, Speaker>;
  boundaries: SessionBoundary[];
  interimText: string;
  onRenameSpeaker: (speakerId: SpeakerId, label: string) => void;
  /** Live sessions follow the newest text and fade new words in; a review starts at the top. */
  isLive: boolean;
  /** Designed empty state — the first thing anyone watching a demo sees. */
  emptyTitle: string;
  emptyHint?: string;
}

const FALLBACK_SPEAKER: Speaker = { id: '', label: 'Unknown speaker', colorIndex: 0 };
// Treat "close enough to the bottom" as caught up, so a user doesn't have to
// pixel-perfectly land at the end to keep auto-scroll engaged.
const AUTO_SCROLL_THRESHOLD_PX = 32;

export function TranscriptView({
  words,
  speakers,
  boundaries,
  interimText,
  onRenameSpeaker,
  isLive,
  emptyTitle,
  emptyHint,
}: TranscriptViewProps) {
  const turns = groupWordsIntoTurns(words);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX);
  };

  // Auto-scroll to the bottom as new content arrives, unless the user has
  // scrolled up to read back (PLAN.md section 8). Only while live — a saved
  // meeting should open at its beginning, not its end.
  useEffect(() => {
    if (!isLive || !autoScroll) return;
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
  }, [isLive, autoScroll, words.length, interimText]);

  const jumpToLatest = () => {
    setAutoScroll(true);
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  };

  const isEmpty = turns.length === 0 && !interimText && boundaries.length === 0;

  // afterWordIndex is always a cumulative word count that lands exactly on
  // a turn boundary (it's recorded as words.length at the moment of a
  // reconnect), so a plain map lookup by running word count is enough to
  // know where each marker belongs. 0 is its own case — a drop before any
  // words exist — since no turn's cumulative count is ever 0.
  const boundariesByWordCount = new Map(boundaries.map((b) => [b.afterWordIndex, b]));
  const leadingBoundary = boundariesByWordCount.get(0);
  const cumulativeWordCounts = turns.reduce<number[]>((counts, turn) => {
    const previous = counts.length > 0 ? counts[counts.length - 1] : 0;
    counts.push(previous + turn.words.length);
    return counts;
  }, []);

  return (
    <div className="relative h-full min-h-0">
      <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-5 py-5">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
            <p className="text-lg font-semibold text-fg">{emptyTitle}</p>
            {emptyHint && <p className="max-w-xs text-sm text-fg-secondary">{emptyHint}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {leadingBoundary && <SessionBoundaryMarker reason={leadingBoundary.reason} />}
            {turns.map((turn, i) => {
              const boundary = boundariesByWordCount.get(cumulativeWordCounts[i]);

              return (
                <div key={turn.words[0]?.start ?? i} className="flex flex-col gap-6">
                  <Turn
                    turn={turn}
                    speaker={speakers[turn.speakerId] ?? { ...FALLBACK_SPEAKER, id: turn.speakerId }}
                    onRenameSpeaker={(label) => onRenameSpeaker(turn.speakerId, label)}
                    interimText={i === turns.length - 1 ? interimText : undefined}
                    fadeInWords={isLive}
                  />
                  {boundary && <SessionBoundaryMarker reason={boundary.reason} />}
                </div>
              );
            })}
            {turns.length === 0 && <InterimText text={interimText} />}
          </div>
        )}
      </div>

      {isLive && !autoScroll && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-fade-in rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-white shadow-overlay transition-colors duration-150 ease-out hover:bg-accent-hover"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
