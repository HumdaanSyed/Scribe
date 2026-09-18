'use client';

import { useMemo } from 'react';
import type { Speaker, SpeakerId, Word } from '@/lib/transcript/model';
import { SpeakerAvatar } from '@/components/transcript/SpeakerAvatar';
import { SpeakerLabel } from '@/components/transcript/SpeakerLabel';

interface SpeakerPanelProps {
  speakers: Record<SpeakerId, Speaker>;
  words: Word[];
  onRenameSpeaker: (speakerId: SpeakerId, label: string) => void;
}

/** Everyone detected so far, with inline rename — a rename updates every turn instantly. */
export function SpeakerPanel({ speakers, words, onRenameSpeaker }: SpeakerPanelProps) {
  const wordCounts = useMemo(() => {
    const counts: Record<SpeakerId, number> = {};
    for (const word of words) {
      counts[word.speakerId] = (counts[word.speakerId] ?? 0) + 1;
    }
    return counts;
  }, [words]);

  const list = Object.values(speakers).sort((a, b) => a.colorIndex - b.colorIndex);

  if (list.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1.5 px-5 text-center">
        <p className="text-lg font-semibold text-fg">No speakers yet</p>
        <p className="max-w-xs text-sm text-fg-secondary">
          People appear here as they’re detected — click a name to rename them everywhere at once.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <p className="micro-label">{list.length === 1 ? '1 speaker' : `${list.length} speakers`}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {list.map((speaker) => (
          <li key={speaker.id} className="flex items-center gap-3">
            <SpeakerAvatar label={speaker.label} colorIndex={speaker.colorIndex} />
            <div className="min-w-0 flex-1">
              <SpeakerLabel label={speaker.label} onRename={(label) => onRenameSpeaker(speaker.id, label)} />
            </div>
            <span className="font-mono text-xs text-fg-muted">{wordCounts[speaker.id] ?? 0} words</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
