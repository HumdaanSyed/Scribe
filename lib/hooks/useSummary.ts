'use client';

import { useCallback, useState } from 'react';
import { streamText } from '@/lib/api/streamText';

/** Streams a new summary from /api/summarize; `onComplete` is called once with the finished text. */
export function useSummary(onComplete: (summary: string) => void) {
  const [streamingSummary, setStreamingSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (transcriptText: string) => {
      setIsGenerating(true);
      setError(null);
      setStreamingSummary('');

      let accumulated = '';
      try {
        await streamText('/api/summarize', { transcript: transcriptText }, (chunk) => {
          accumulated += chunk;
          setStreamingSummary(accumulated);
        });
        onComplete(accumulated);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not generate a summary.');
      } finally {
        setIsGenerating(false);
      }
    },
    [onComplete],
  );

  return { streamingSummary, isGenerating, error, generate };
}
