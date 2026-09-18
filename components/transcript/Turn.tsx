import type { Speaker } from '@/lib/transcript/model';
import type { TranscriptTurn } from '@/lib/transcript/grouping';
import { formatTimestamp } from '@/lib/transcript/formatting';
import { SpeakerAvatar } from './SpeakerAvatar';
import { SpeakerLabel } from './SpeakerLabel';
import { InterimText } from './InterimText';

interface TurnProps {
  turn: TranscriptTurn;
  speaker: Speaker;
  onRenameSpeaker: (label: string) => void;
  /** Only set for the most recent turn, while it's still in progress. */
  interimText?: string;
  /** Fade each newly arrived word in (~120ms) instead of snapping — live sessions only. */
  fadeInWords?: boolean;
}

/**
 * One speaker turn: [avatar] [rename-able name] [timestamp], then the
 * turn's text flowing as a paragraph with generous line height
 * (PLAN.md section 8).
 */
export function Turn({ turn, speaker, onRenameSpeaker, interimText, fadeInWords }: TurnProps) {
  const startTime = turn.words[0]?.start ?? 0;

  return (
    <div className="flex gap-3">
      <SpeakerAvatar label={speaker.label} colorIndex={speaker.colorIndex} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SpeakerLabel label={speaker.label} onRename={onRenameSpeaker} />
          <span className="font-mono text-xs text-fg-muted">{formatTimestamp(startTime)}</span>
        </div>
        <p className="mt-0.5 text-base leading-7 text-fg">
          {/* Words are only ever appended, so index keys are stable: each span
              mounts (and fades in) exactly once, when its word arrives. */}
          {turn.words.map((word, i) => (
            <span key={i} className={fadeInWords ? 'animate-fade-in' : undefined}>
              {i > 0 && ' '}
              {word.text}
            </span>
          ))}
          <InterimText text={interimText} inline />
        </p>
      </div>
    </div>
  );
}
