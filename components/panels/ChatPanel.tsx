'use client';

import { useCallback, useState } from 'react';
import { streamText } from '@/lib/api/streamText';
import type { ChatMessage } from '@/lib/transcript/model';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  transcriptText: string;
  onChatHistoryChange: (history: ChatMessage[]) => void;
}

// Clickable when the chat is empty, so a demo viewer who doesn't know what
// to type can still see the feature work (PLAN.md section 9).
const STARTER_QUESTIONS = [
  'What did we decide?',
  'What are my action items?',
  'Summarize what was discussed',
];

export function ChatPanel({ chatHistory, transcriptText, onChatHistoryChange }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingReply, setStreamingReply] = useState<string | null>(null);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isSending) return;

      // Save the question immediately, before the reply arrives — if the
      // request fails, the user's question isn't lost.
      const historyWithQuestion: ChatMessage[] = [...chatHistory, { role: 'user', content: trimmed }];
      onChatHistoryChange(historyWithQuestion);
      setInput('');
      setIsSending(true);
      setError(null);
      setStreamingReply('');

      let accumulated = '';
      try {
        await streamText(
          '/api/chat',
          { transcript: transcriptText, history: historyWithQuestion },
          (chunk) => {
            accumulated += chunk;
            setStreamingReply(accumulated);
          },
        );
        onChatHistoryChange([...historyWithQuestion, { role: 'assistant', content: accumulated }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not get a response.');
      } finally {
        setIsSending(false);
        setStreamingReply(null);
      }
    },
    [chatHistory, transcriptText, onChatHistoryChange, isSending],
  );

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900">Ask</h2>

      <div className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto">
        {chatHistory.length === 0 && !streamingReply && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-gray-400">Ask a question about this meeting.</p>
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-gray-200 px-3 py-1 text-left text-xs text-gray-600 hover:bg-gray-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {chatHistory.map((message, i) => (
          <div key={i} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                message.role === 'user'
                  ? 'inline-block max-w-[85%] rounded-lg bg-indigo-600 px-3 py-2 text-left text-sm text-white'
                  : 'inline-block max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-left text-sm text-gray-900'
              }
            >
              {message.content}
            </span>
          </div>
        ))}

        {streamingReply !== null && (
          <div className="text-left">
            <span className="inline-block max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">
              {streamingReply || '…'}
            </span>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this meeting…"
          disabled={isSending}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
