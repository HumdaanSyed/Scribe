'use client';

import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
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
  const hasTranscript = transcriptText.trim().length > 0;
  const run = () => void generate(transcriptText);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className="micro-label">Meeting notes</p>
        {displayText && (
          <Button size="sm" variant="secondary" onClick={run} disabled={isGenerating}>
            {isGenerating ? 'Generating…' : 'Regenerate'}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {error && (
          <div className="mb-4">
            <ErrorNotice message={error} onRetry={run} />
          </div>
        )}

        {displayText ? (
          <div className="text-fg-secondary">
            <MarkdownText markdown={displayText} />
          </div>
        ) : isGenerating ? (
          <p className="text-base text-fg-muted">Reading the transcript…</p>
        ) : (
          !error && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex flex-col gap-1.5">
                <p className="text-lg font-semibold text-fg">No summary yet</p>
                <p className="max-w-xs text-sm text-fg-secondary">
                  {hasTranscript
                    ? 'Turn this transcript into structured notes: an overview, key points, decisions, and action items.'
                    : 'There is nothing to summarize — no speech was captured in this meeting.'}
                </p>
              </div>
              {hasTranscript && (
                <Button variant="primary" onClick={run}>
                  Generate summary
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
