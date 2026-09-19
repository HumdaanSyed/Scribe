'use client';

import { cn } from '@/lib/ui/cn';

interface AudioSourceTogglesProps {
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  onMicChange: (enabled: boolean) => void;
  onSystemAudioChange: (enabled: boolean) => void;
  /** Locked once a recording is in progress — sources aren't changed mid-session. */
  disabled?: boolean;
}

interface SourceToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function SourceToggle({ label, checked, disabled, onChange }: SourceToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-control border px-3 text-sm font-medium',
        'transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60',
        checked
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line-strong bg-surface text-fg-secondary enabled:hover:bg-sunken',
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', checked ? 'bg-accent' : 'bg-line-strong')} />
      {label}
    </button>
  );
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SourceToggle label="Microphone" checked={micEnabled} disabled={disabled} onChange={onMicChange} />
        <SourceToggle
          label="System audio"
          checked={systemAudioEnabled}
          disabled={disabled}
          onChange={onSystemAudioChange}
        />
      </div>

      {systemAudioEnabled && (
        <p className="animate-panel-in rounded-control border border-warn/25 bg-warn/5 px-3 py-2 text-xs leading-5 text-fg-secondary">
          To capture background audio on macOS, choose the <strong className="font-semibold text-fg">Chrome Tab</strong>{' '}
          tab in the picker and enable <strong className="font-semibold text-fg">Share tab audio</strong>. Audio from
          native desktop apps cannot be captured without a virtual audio device.
        </p>
      )}
    </div>
  );
}
