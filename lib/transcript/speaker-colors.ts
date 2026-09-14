// Speaker palette (PLAN.md section 13) — dots/avatars only, never text color.
export const SPEAKER_COLORS = [
  '#4F46E5',
  '#0891B2',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#059669',
] as const;

export function colorForIndex(colorIndex: number): string {
  return SPEAKER_COLORS[colorIndex % SPEAKER_COLORS.length];
}
