'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { Input } from '@/components/ui/Input';
import { streamText } from '@/lib/api/streamText';
import type { ChatMessage } from '@/lib/transcript/model';
import { MarkdownText } from './MarkdownText';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  transcriptText: string;
  /** Current speaker names, used to make a starter question specific to this meeting. */
  speakerLabels: string[];
  onChatHistoryChange: (history: ChatMessage[]) => void;
}

const ASSISTANT_BUBBLE = 'self-start max-w-[92%] rounded-card bg-sunken px-3 py-2 text-fg';

export function ChatPanel({ chatHistory, transcriptText, speakerLabels, onChatHistoryChange }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingReply, setStreamingReply] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const hasTranscript = transcriptText.trim().length > 0;
  const lastMessage = chatHistory[chatHistory.length - 1];
  const hasUnansweredQuestion = lastMessage?.role === 'user';

  // Clickable when the chat is empty, so a demo viewer who doesn't know what
  // to type can still see the feature work (PLAN.md section 9).
  const starterQuestions = [
    'What did we decide?',
    'What are my action items?',
    speakerLabels.length > 0 ? `Summarize what ${speakerLabels[0]} said` : 'Summarize what was discussed',
  ];

  // Keep the newest message (or the reply being streamed) in view.
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [chatHistory.length, streamingReply]);

  // `history` must already end with the user's question.
  const run = useCallback(
    async (history: ChatMessage[]) => {
      setIsSending(true);
      setError(null);
      setStreamingReply('');

      let accumulated = '';
      try {
        await streamText('/api/chat', { transcript: transcriptText, history }, (chunk) => {
          accumulated += chunk;
          setStreamingReply(accumulated);
        });
        if (!accumulated.trim()) throw new Error('The model returned an empty reply.');
        onChatHistoryChange([...history, { role: 'assistant', content: accumulated }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not get a response.');
      } finally {
        setIsSending(false);
        setStreamingReply(null);
      }
    },
    [transcriptText, onChatHistoryChange],
  );

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isSending) return;

      // Save the question immediately, before the reply arrives — if the
      // request fails, the user's question isn't lost (and can be retried).
      const historyWithQuestion: ChatMessage[] = [...chatHistory, { role: 'user', content: trimmed }];
      onChatHistoryChange(historyWithQuestion);
      setInput('');
      await run(historyWithQuestion);
    },
    [chatHistory, isSending, onChatHistoryChange, run],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {chatHistory.length === 0 && streamingReply === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-semibold text-fg">Ask about this meeting</p>
              <p className="max-w-xs text-sm text-fg-secondary">
                {hasTranscript
                  ? 'Answers come only from the transcript — if it isn’t covered, you’ll be told.'
                  : 'There is nothing to ask about — no speech was captured in this meeting.'}
              </p>
            </div>
            {hasTranscript && (
              <div className="flex flex-wrap justify-center gap-2">
                {starterQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void send(question)}
                    className="rounded-chip border border-line-strong bg-surface px-3 py-1.5 text-sm text-fg-secondary transition-colors duration-150 ease-out hover:border-accent hover:bg-accent-soft hover:text-accent"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {chatHistory.map((message, i) =>
              message.role === 'user' ? (
                <div
                  key={i}
                  className="max-w-[85%] self-end rounded-card bg-accent px-3 py-2 text-base whitespace-pre-wrap text-white"
                >
                  {message.content}
                </div>
              ) : (
                <div key={i} className={ASSISTANT_BUBBLE}>
                  <MarkdownText markdown={message.content} />
                </div>
              ),
            )}
            {streamingReply !== null && (
              <div className={ASSISTANT_BUBBLE}>
                {streamingReply ? (
                  <MarkdownText markdown={streamingReply} />
                ) : (
                  <p className="text-base text-fg-muted">Thinking…</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        {error && (
          <div className="mb-3">
            <ErrorNotice message={error} onRetry={hasUnansweredQuestion ? () => void run(chatHistory) : undefined} />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this meeting…"
            aria-label="Ask about this meeting"
            disabled={isSending || !hasTranscript}
          />
          <Button type="submit" variant="primary" disabled={isSending || !hasTranscript || !input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
