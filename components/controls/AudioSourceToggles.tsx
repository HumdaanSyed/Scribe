'use client';

interface AudioSourceTogglesProps {
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  onMicChange: (enabled: boolean) => void;
  onSystemAudioChange: (enabled: boolean) => void;
  /** Locked once a recording is in progress — sources aren't changed mid-session. */
  disabled?: boolean;
}

/**
 * Independent Microphone / System audio toggles, with the macOS tab-audio
 * hint shown inline as soon as System audio is enabled — before the
 * getDisplayMedia picker ever opens (PLAN.md section 4).
 */
export function AudioSourceToggles({
  micEnabled,
  systemAudioEnabled,
  onMicChange,
  onSystemAudioChange,
  disabled,
}: AudioSourceTogglesProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={micEnabled}
            disabled={disabled}
            onChange={(e) => onMicChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
          Microphone
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={systemAudioEnabled}
            disabled={disabled}
            onChange={(e) => onSystemAudioChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
          System audio
        </label>
      </div>

      {systemAudioEnabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          To capture background audio on macOS, choose the <strong>Chrome Tab</strong> tab in the
          picker and enable <strong>Share tab audio</strong>. Audio from native desktop apps
          cannot be captured without a virtual audio device.
        </p>
      )}
    </div>
  );
}
