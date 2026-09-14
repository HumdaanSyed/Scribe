import type { Speaker } from '@/lib/transcript/model';
import type { TranscriptTurn } from '@/lib/transcript/grouping';
import { colorForIndex } from '@/lib/transcript/speaker-colors';
import { formatTimestamp } from '@/lib/transcript/formatting';
import { SpeakerLabel } from './SpeakerLabel';
import { InterimText } from './InterimText';

interface TurnProps {
  turn: TranscriptTurn;
  speaker: Speaker;
  onRenameSpeaker: (label: string) => void;
  /** Only set for the most recent turn, while it's still in progress. */
  interimText?: string;
}

/**
 * One speaker turn: [color dot] [rename-able name] [timestamp], then the
 * turn's text flowing as a paragraph (PLAN.md section 8).
 */
export function Turn({ turn, speaker, onRenameSpeaker, interimText }: TurnProps) {
  const text = turn.words.map((w) => w.text).join(' ');
  const startTime = turn.words[0]?.start ?? 0;

  return (
    <div className="flex gap-3 py-2">
      <span
        className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: colorForIndex(speaker.colorIndex) }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <SpeakerLabel label={speaker.label} onRename={onRenameSpeaker} />
          <span className="font-mono text-xs text-gray-400">{formatTimestamp(startTime)}</span>
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-900">
          {text}
          <InterimText text={interimText} inline />
        </p>
      </div>
    </div>
  );
}
