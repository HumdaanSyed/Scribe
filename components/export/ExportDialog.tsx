'use client';

import { useState } from 'react';

export interface ExportOptions {
  includeSummary: boolean;
  includeTimestamps: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  hasSummary: boolean;
  onExport: (options: ExportOptions) => Promise<void>;
}

/** Transcript only / transcript + summary, plus an include-timestamps checkbox (PLAN.md section 10). */
export function ExportDialog({ open, onClose, hasSummary, onExport }: ExportDialogProps) {
  const [includeSummary, setIncludeSummary] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      await onExport({ includeSummary: includeSummary && hasSummary, includeTimestamps });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export the PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-gray-900">Export transcript</h2>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="export-content"
              checked={!includeSummary}
              onChange={() => setIncludeSummary(false)}
            />
            Transcript only
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${hasSummary ? 'text-gray-700' : 'text-gray-400'}`}
          >
            <input
              type="radio"
              name="export-content"
              checked={includeSummary}
              disabled={!hasSummary}
              onChange={() => setIncludeSummary(true)}
            />
            Transcript + summary{!hasSummary && ' (generate a summary first)'}
          </label>

          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeTimestamps}
              onChange={(e) => setIncludeTimestamps(e.target.checked)}
            />
            Include timestamps
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
