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
  // scrolled up to read back (PLAN.md section 8).
  useEffect(() => {
    if (autoScroll) {
      containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight });
    }
  }, [turns.length, interimText, autoScroll]);

  const jumpToLatest = () => {
    setAutoScroll(true);
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  };

  const isEmpty = turns.length === 0 && !interimText;

  // afterWordIndex is always a cumulative word count that lands exactly on
  // a turn boundary (it's recorded as words.length at the moment of a
  // reconnect), so a plain map lookup by running word count is enough to
  // know where each marker belongs.
  const boundariesByWordCount = new Map(boundaries.map((b) => [b.afterWordIndex, b]));
  const cumulativeWordCounts = turns.reduce<number[]>((counts, turn) => {
    const previous = counts.length > 0 ? counts[counts.length - 1] : 0;
    counts.push(previous + turn.words.length);
    return counts;
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[28rem] overflow-y-auto rounded-lg bg-gray-50 p-4"
      >
        {isEmpty ? (
          <p className="text-sm text-gray-400">Transcript will appear here…</p>
        ) : (
          <>
            {turns.map((turn, i) => {
              const boundary = boundariesByWordCount.get(cumulativeWordCounts[i]);

              return (
                <div key={turn.words[0]?.start ?? i}>
                  <Turn
                    turn={turn}
                    speaker={speakers[turn.speakerId] ?? { ...FALLBACK_SPEAKER, id: turn.speakerId }}
                    onRenameSpeaker={(label) => onRenameSpeaker(turn.speakerId, label)}
                    interimText={i === turns.length - 1 ? interimText : undefined}
                  />
                  {boundary && <SessionBoundaryMarker reason={boundary.reason} />}
                </div>
              );
            })}
            {turns.length === 0 && <InterimText text={interimText} />}
          </>
        )}
      </div>

      {!autoScroll && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}
