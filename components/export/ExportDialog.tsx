'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { cn } from '@/lib/ui/cn';

export interface ExportOptions {
  includeSummary: boolean;
  includeTimestamps: boolean;
}

interface ExportDialogProps {
  onClose: () => void;
  hasSummary: boolean;
  onExport: (options: ExportOptions) => Promise<void>;
}

interface ContentOptionProps {
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function ContentOption({ title, description, selected, disabled, onSelect }: ContentOptionProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-control border p-3 transition-colors duration-150 ease-out',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        selected ? 'border-accent bg-accent-soft' : 'border-line-strong',
        !selected && !disabled && 'hover:bg-sunken',
      )}
    >
      <input
        type="radio"
        name="export-content"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5 accent-accent"
      />
      <span>
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block text-xs text-fg-secondary">{description}</span>
      </span>
    </label>
  );
}

/**
 * Transcript only / transcript + summary, plus an include-timestamps
 * checkbox (PLAN.md section 10). Mounted only while open, so every open
 * starts from a clean state.
 */
export function ExportDialog({ onClose, hasSummary, onExport }: ExportDialogProps) {
  const [includeSummary, setIncludeSummary] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isExporting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, isExporting]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await onExport({ includeSummary: includeSummary && hasSummary, includeTimestamps });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the PDF.');
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-fg/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isExporting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md animate-panel-in rounded-card border border-line bg-surface p-6 shadow-overlay outline-none"
      >
        <h2 id="export-dialog-title" className="text-xl font-semibold text-fg">
          Export as PDF
        </h2>
        <p className="mt-1 text-sm text-fg-secondary">A designed document, ready to share or print.</p>

        <fieldset className="mt-5 flex flex-col gap-2">
          <legend className="micro-label mb-2">Contents</legend>
          <ContentOption
            title="Transcript only"
            description="Speaker-labelled turns, in order."
            selected={!includeSummary}
            onSelect={() => setIncludeSummary(false)}
          />
          <ContentOption
            title="Transcript + summary"
            description={hasSummary ? 'Meeting notes first, then the transcript.' : 'Generate a summary first to include it.'}
            selected={includeSummary}
            disabled={!hasSummary}
            onSelect={() => setIncludeSummary(true)}
          />
        </fieldset>

        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-fg">
          <input
            type="checkbox"
            checked={includeTimestamps}
            onChange={(e) => setIncludeTimestamps(e.target.checked)}
            className="accent-accent"
          />
          Include timestamps
        </label>

        {error && (
          <div className="mt-4">
            <ErrorNotice message={error} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleExport()} disabled={isExporting}>
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}
