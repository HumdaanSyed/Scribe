'use client';

import { useSummary } from '@/lib/hooks/useSummary';
import { MarkdownText } from './MarkdownText';

interface SummaryPanelProps {
  summary: string | null;
  transcriptText: string;
  onSummaryComplete: (summary: string) => void;
}

/** Generate on demand, or show what's already there (PLAN.md section 12). */
export function SummaryPanel({ summary, transcriptText, onSummaryComplete }: SummaryPanelProps) {
  const { streamingSummary, isGenerating, error, generate } = useSummary(onSummaryComplete);
  const displayText = streamingSummary ?? summary;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
        <button
          onClick={() => generate(transcriptText)}
          disabled={isGenerating}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? 'Generating…' : summary ? 'Regenerate' : 'Generate summary'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {displayText ? (
        <MarkdownText markdown={displayText} />
      ) : (
        !isGenerating && <p className="mt-3 text-sm text-gray-400">No summary yet.</p>
      )}
    </div>
  );
}
