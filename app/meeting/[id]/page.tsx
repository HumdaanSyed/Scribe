'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useMeeting } from '@/lib/hooks/useMeeting';
import { AudioLevelMeter } from '@/components/controls/AudioLevelMeter';
import { AudioSourceToggles } from '@/components/controls/AudioSourceToggles';
import { TranscriptView } from '@/components/transcript/TranscriptView';
import { SummaryPanel } from '@/components/panels/SummaryPanel';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { ExportDialog, type ExportOptions } from '@/components/export/ExportDialog';
import { TranscriptPDF } from '@/components/export/TranscriptPDF';
import { formatDate, formatTimestamp, formatTranscriptForModel } from '@/lib/transcript/formatting';
import { groupWordsIntoTurns } from '@/lib/transcript/grouping';
import { exportFilename } from '@/lib/export/filename';
import { downloadBlob } from '@/lib/export/download';
import { pdf } from '@react-pdf/renderer';

// TEMPORARY styling. This is the real Live/Review screen (PLAN.md section
// 12) — Phase 9 applies the full design system on top of this structure.
export default function MeetingPage({ params }: PageProps<'/meeting/[id]'>) {
  const { id } = use(params);
  const meeting = useMeeting(id);

  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);

  const startingRef = useRef(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setIsStarting(true);

    try {
      await meeting.transcript.connect();
      const result = await meeting.recorder.start({ mic: micEnabled, systemAudio: systemAudioEnabled });
      if (!result.started) {
        meeting.transcript.disconnect();
      }
      if (result.systemAudioError) {
        setSystemAudioEnabled(false);
      }
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [meeting.transcript, meeting.recorder, micEnabled, systemAudioEnabled]);

  const handlePause = useCallback(() => {
    meeting.recorder.pause();
    meeting.transcript.pause();
  }, [meeting.recorder, meeting.transcript]);

  const handleResume = useCallback(() => {
    meeting.recorder.resume();
    meeting.transcript.resume();
  }, [meeting.recorder, meeting.transcript]);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleExport = useCallback(
    async ({ includeSummary, includeTimestamps }: ExportOptions) => {
      const turns = groupWordsIntoTurns(meeting.reviewWords);
      const participants = Object.values(meeting.reviewSpeakers).map((s) => s.label);

      const blob = await pdf(
        <TranscriptPDF
          title={meeting.title}
          dateLabel={formatDate(meeting.createdAt)}
          durationLabel={formatTimestamp(meeting.durationSeconds)}
          participants={participants}
          turns={turns}
          speakers={meeting.reviewSpeakers}
          includeTimestamps={includeTimestamps}
          summary={includeSummary ? meeting.summary : null}
        />,
      ).toBlob();

      downloadBlob(blob, exportFilename(meeting.title, meeting.createdAt));
    },
    [
      meeting.reviewWords,
      meeting.reviewSpeakers,
      meeting.title,
      meeting.createdAt,
      meeting.durationSeconds,
      meeting.summary,
    ],
  );

  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(meeting.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [titleEditing]);

  const startEditingTitle = () => {
    setTitleDraft(meeting.title);
    setTitleEditing(true);
  };

  const commitTitle = () => {
    meeting.renameTitle(titleDraft);
    setTitleEditing(false);
  };

  // Only needed once we're in review mode, but computed unconditionally —
  // hooks can't be called after the early return below.
  const transcriptText = useMemo(
    () => formatTranscriptForModel(meeting.reviewWords, meeting.reviewSpeakers),
    [meeting.reviewWords, meeting.reviewSpeakers],
  );

  if (meeting.mode === 'loading') {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  const error = meeting.recorder.error ?? meeting.transcript.error ?? meeting.persistenceError;
  const sourcesLocked = meeting.recorder.status !== 'idle';
  const isLive = meeting.mode === 'live';

  return (
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Meetings
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {titleEditing ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(meeting.title);
                  setTitleEditing(false);
                }
              }}
              className="rounded border border-indigo-300 px-1.5 py-0.5 text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          ) : (
            <button
              onClick={startEditingTitle}
              className="rounded px-1.5 py-0.5 text-lg font-semibold text-gray-900 hover:bg-gray-100"
              title="Click to rename"
            >
              {meeting.title}
            </button>
          )}

          <span className="font-mono text-sm text-gray-400">
            {formatTimestamp(meeting.durationSeconds)}
          </span>

          {meeting.recorder.status === 'paused' && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-700">
              Paused
            </span>
          )}
          {meeting.recorder.status === 'recording' && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-red-700">
              Recording
            </span>
          )}
        </div>

        {isLive && (
          <>
            <div className="mt-4">
              <AudioSourceToggles
                micEnabled={micEnabled}
                systemAudioEnabled={systemAudioEnabled}
                onMicChange={setMicEnabled}
                onSystemAudioChange={setSystemAudioEnabled}
                disabled={sourcesLocked}
              />
            </div>

            <div className="mt-6">
              <AudioLevelMeter level={meeting.recorder.level} />
            </div>

            <div className="mt-6 flex items-center gap-3">
              {meeting.recorder.status === 'idle' && (
                <button
                  onClick={handleStart}
                  disabled={(!micEnabled && !systemAudioEnabled) || isStarting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isStarting ? 'Starting…' : 'Record'}
                </button>
              )}
              {meeting.recorder.status === 'recording' && (
                <>
                  <button
                    onClick={handlePause}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                  >
                    Pause
                  </button>
                  <button
                    onClick={meeting.stop}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Stop
                  </button>
                </>
              )}
              {meeting.recorder.status === 'paused' && (
                <>
                  <button
                    onClick={handleResume}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Resume
                  </button>
                  <button
                    onClick={meeting.stop}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {!isLive && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setExportDialogOpen(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Export
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6">
          {isLive ? (
            <TranscriptView
              words={meeting.transcript.words}
              speakers={meeting.transcript.speakers}
              boundaries={meeting.transcript.boundaries}
              interimText={meeting.transcript.interimText}
              onRenameSpeaker={meeting.renameSpeaker}
            />
          ) : (
            <TranscriptView
              words={meeting.reviewWords}
              speakers={meeting.reviewSpeakers}
              boundaries={meeting.reviewBoundaries}
              interimText=""
              onRenameSpeaker={meeting.renameSpeaker}
            />
          )}
        </div>

        {!isLive && (
          <div className="mt-6 flex flex-col gap-6">
            <SummaryPanel
              summary={meeting.summary}
              transcriptText={transcriptText}
              onSummaryComplete={meeting.updateSummary}
            />
            <ChatPanel
              chatHistory={meeting.chatHistory}
              transcriptText={transcriptText}
              onChatHistoryChange={meeting.updateChatHistory}
            />
          </div>
        )}
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        hasSummary={!!meeting.summary}
        onExport={handleExport}
      />
    </main>
  );
}
