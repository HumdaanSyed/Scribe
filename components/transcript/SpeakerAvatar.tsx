import { colorForIndex } from '@/lib/transcript/speaker-colors';

/** Default labels ("Speaker 3") show their number; renamed speakers show their initial. */
function avatarText(label: string): string {
  const trimmed = label.trim();
  const numbered = /^speaker\s+(\d+)$/i.exec(trimmed);
  if (numbered) return numbered[1];
  return trimmed.charAt(0).toUpperCase() || '?';
}

/**
 * The speaker's color lives here (and on dots) only — never on text
 * (PLAN.md section 13). Decorative: the speaker's name is always adjacent.
 */
export function SpeakerAvatar({ label, colorIndex }: { label: string; colorIndex: number }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: colorForIndex(colorIndex) }}
    >
      {avatarText(label)}
    </span>
  );
}
