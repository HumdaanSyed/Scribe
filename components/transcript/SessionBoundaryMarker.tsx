interface SessionBoundaryMarkerProps {
  reason: string;
}

/**
 * A thin horizontal rule with a label, rendered where a reconnect happened
 * mid-recording — an honest cue that speaker labels may need remapping
 * below it, rather than a silently-wrong transcript (PLAN.md section 6).
 */
export function SessionBoundaryMarker({ reason }: SessionBoundaryMarkerProps) {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label={reason}>
      <div className="h-px flex-1 bg-amber-300" />
      <span className="text-xs text-amber-700">{reason}</span>
      <div className="h-px flex-1 bg-amber-300" />
    </div>
  );
}
