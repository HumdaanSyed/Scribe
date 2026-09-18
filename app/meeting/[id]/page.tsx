'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { pdf } from '@react-pdf/renderer';
import { useMeeting } from '@/lib/hooks/useMeeting';
import { AudioLevelMeter } from '@/components/controls/AudioLevelMeter';
import { AudioSourceToggles } from '@/components/controls/AudioSourceToggles';
import { EditableTitle } from '@/components/controls/EditableTitle';
import { RecordingStatus } from '@/components/controls/RecordingStatus';
import { TransportControls } from '@/components/controls/TransportControls';
import { TranscriptView } from '@/components/transcript/TranscriptView';
import { SummaryPanel } from '@/components/panels/SummaryPanel';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { SpeakerPanel } from '@/components/panels/SpeakerPanel';
import { ExportDialog, type ExportOptions } from '@/components/export/ExportDialog';
import { TranscriptPDF } from '@/components/export/TranscriptPDF';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatTimestamp, formatTranscriptForModel } from '@/lib/transcript/formatting';
import { groupWordsIntoTurns } from '@/lib/transcript/grouping';
import { exportFilename } from '@/lib/export/filename';
import { downloadBlob } from '@/lib/export/download';

type RailTab = 'summary' | 'ask' | 'speakers';

const REVIEW_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'ask', label: 'Ask' },
  { id: 'speakers', label: 'Speakers' },
] as const;

// Transcript and rail share a height so the screen reads as one workspace.
const PANE_HEIGHT = 'h-[60vh] min-h-[22rem] lg:h-[70vh]';

export default function MeetingPage({ params }: PageProps<'/meeting/[id]'>) {
  const { id } = use(params);
  const meeting = useMeeting(id);
  const toast = useToast();

  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>('summary');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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
        // Leave the toggle off rather than silently recording without it
        // (PLAN.md section 4) — the error itself is surfaced as a toast below.
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

      const filename = exportFilename(meeting.title, meeting.createdAt);
      downloadBlob(blob, filename);
      toast.success(`Exported ${filename}`);
    },
    [
      meeting.reviewWords,
      meeting.reviewSpeakers,
      meeting.title,
      meeting.createdAt,
      meeting.durationSeconds,
      meeting.summary,
      toast,
    ],
  );

  const closeExportDialog = useCallback(() => setExportDialogOpen(false), []);

  // Errors surface as toasts (PLAN.md section 4: "show a clear error toast").
  const recorderError = meeting.recorder.error;
  const transcriptError = meeting.transcript.error;
  const persistenceError = meeting.persistenceError;
  useEffect(() => {
    if (recorderError) toast.error(recorderError);
  }, [recorderError, toast]);
  useEffect(() => {
    if (transcriptError) toast.error(transcriptError);
  }, [transcriptError, toast]);
  useEffect(() => {
    if (persistenceError) toast.error(persistenceError);
  }, [persistenceError, toast]);

  // Only needed once we're in review mode, but computed unconditionally —
  // hooks can't be called after the early return below.
  const transcriptText = useMemo(
    () => formatTranscriptForModel(meeting.reviewWords, meeting.reviewSpeakers),
    [meeting.reviewWords, meeting.reviewSpeakers],
  );

  if (meeting.mode === 'loading') {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-6 py-8 sm:px-8">
        <span className="sr-only">Loading meeting…</span>
        <div aria-hidden>
          <div className="h-5 w-20 rounded-chip bg-sunken" />
          <Card className="mt-4 h-[76px]">
            <div className="h-6 w-64 rounded-chip bg-sunken" />
          </Card>
          <Card padded={false} className={`mt-8 ${PANE_HEIGHT}`} />
        </div>
      </main>
    );
  }

  const isLive = meeting.mode === 'live';
  const recorderStatus = meeting.recorder.status;

  const words = isLive ? meeting.transcript.words : meeting.reviewWords;
  const speakers = isLive ? meeting.transcript.speakers : meeting.reviewSpeakers;
  const boundaries = isLive ? meeting.transcript.boundaries : meeting.reviewBoundaries;
  const interimText = isLive ? meeting.transcript.interimText : '';
  const speakerLabels = Object.values(speakers)
    .sort((a, b) => a.colorIndex - b.colorIndex)
    .map((s) => s.label);

  let emptyTitle: string;
  let emptyHint: string;
  if (!isLive) {
    emptyTitle = 'No speech captured';
    emptyHint = 'This meeting doesn’t have a transcript.';
  } else if (recorderStatus === 'recording') {
    emptyTitle = 'Listening…';
    emptyHint = 'Start speaking — words appear here in real time, grouped by speaker.';
  } else if (recorderStatus === 'paused') {
    emptyTitle = 'Paused';
    emptyHint = 'Resume to keep transcribing.';
  } else {
    emptyTitle = 'Ready when you are';
    emptyHint = 'Press Record. Your words appear here within a second, grouped by speaker.';
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-8 sm:px-8">
      <Link href="/" className="text-sm text-fg-secondary transition-colors duration-150 ease-out hover:text-fg">
        ← Meetings
      </Link>

      {/* Top bar: editable title, elapsed timer, recording status, actions */}
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* min-w so the title group wraps the actions onto their own row instead of being crushed. */}
        <div className="flex min-w-[16rem] flex-1 items-center gap-3">
          <EditableTitle value={meeting.title} onCommit={meeting.renameTitle} />
          <span className="font-mono text-sm tabular-nums text-fg-secondary">
            {formatTimestamp(meeting.durationSeconds)}
          </span>
          {isLive ? (
            <RecordingStatus status={recorderStatus} reconnecting={meeting.transcript.connectionState === 'reconnecting'} />
          ) : (
            <span className="hidden text-sm text-fg-muted sm:inline">{formatDate(meeting.createdAt)}</span>
          )}
        </div>

        {isLive ? (
          // Available once there's a transcript to work with — i.e. after Stop.
          <span title="Available after you stop recording" className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled>
              Summarize
            </Button>
            <Button size="sm" variant="secondary" disabled>
              Ask
            </Button>
            <Button size="sm" variant="secondary" disabled>
              Export
            </Button>
          </span>
        ) : (
          <Button variant="secondary" onClick={() => setExportDialogOpen(true)}>
            Export
          </Button>
        )}
      </Card>

      {/* Sources + transport (live only) */}
      {isLive && (
        <Card className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <AudioSourceToggles
              micEnabled={micEnabled}
              systemAudioEnabled={systemAudioEnabled}
              onMicChange={setMicEnabled}
              onSystemAudioChange={setSystemAudioEnabled}
              disabled={recorderStatus !== 'idle'}
            />
            <TransportControls
              status={recorderStatus}
              isStarting={isStarting}
              canStart={micEnabled || systemAudioEnabled}
              onStart={() => void handleStart()}
              onPause={handlePause}
              onResume={handleResume}
              onStop={() => void meeting.stop()}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="micro-label">Input</span>
            <div className="flex-1">
              <AudioLevelMeter level={meeting.recorder.level} />
            </div>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        {/* Transcript: the dominant element on screen */}
        <Card padded={false} className={`flex flex-col ${PANE_HEIGHT}`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <p className="micro-label">Transcript</p>
            <p className="font-mono text-xs text-fg-muted">
              {words.length} word{words.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="min-h-0 flex-1">
            <TranscriptView
              words={words}
              speakers={speakers}
              boundaries={boundaries}
              interimText={interimText}
              onRenameSpeaker={meeting.renameSpeaker}
              isLive={isLive}
              emptyTitle={emptyTitle}
              emptyHint={emptyHint}
            />
          </div>
        </Card>

        {/* Right rail: speakers while live; Summary / Ask / Speakers in review */}
        <Card padded={false} className={`flex min-w-0 flex-col ${PANE_HEIGHT}`}>
          {isLive ? (
            <>
              <div className="border-b border-line px-5 py-3">
                <p className="micro-label">Speakers</p>
              </div>
              <div className="min-h-0 flex-1">
                <SpeakerPanel speakers={speakers} words={words} onRenameSpeaker={meeting.renameSpeaker} />
              </div>
            </>
          ) : (
            <>
              <Tabs tabs={REVIEW_TABS} active={railTab} onChange={setRailTab} label="Meeting tools" />
              <div
                role="tabpanel"
                id={`tabpanel-${railTab}`}
                aria-labelledby={`tab-${railTab}`}
                className="min-h-0 flex-1"
              >
                {railTab === 'summary' && (
                  <SummaryPanel
                    summary={meeting.summary}
                    transcriptText={transcriptText}
                    onSummaryComplete={meeting.updateSummary}
                  />
                )}
                {railTab === 'ask' && (
                  <ChatPanel
                    chatHistory={meeting.chatHistory}
                    transcriptText={transcriptText}
                    speakerLabels={speakerLabels}
                    onChatHistoryChange={meeting.updateChatHistory}
                  />
                )}
                {railTab === 'speakers' && (
                  <SpeakerPanel speakers={speakers} words={words} onRenameSpeaker={meeting.renameSpeaker} />
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      {exportDialogOpen && (
        <ExportDialog onClose={closeExportDialog} hasSummary={!!meeting.summary} onExport={handleExport} />
      )}
    </main>
  );
}
