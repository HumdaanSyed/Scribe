'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { deleteMeeting, listMeetings } from '@/lib/storage/meetings';
import type { Meeting } from '@/lib/transcript/model';
import { formatDate, formatTimestamp } from '@/lib/transcript/formatting';

interface MeetingCardProps {
  meeting: Meeting;
  confirmingDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}

function MeetingCard({ meeting, confirmingDelete, onOpen, onDelete, onCancelDelete }: MeetingCardProps) {
  const speakerCount = Object.keys(meeting.speakers).length;

  return (
    <Card padded={false} className="flex h-full flex-col transition-colors duration-150 ease-out hover:border-line-strong">
      <button type="button" onClick={onOpen} className="flex-1 rounded-t-card p-5 text-left">
        <p className="truncate text-base font-medium text-fg">{meeting.title}</p>
        <p className="mt-1 text-sm text-fg-secondary">{formatDate(meeting.createdAt)}</p>
        <p className="mt-4 flex items-center gap-2 font-mono text-xs text-fg-muted">
          <span>{formatTimestamp(meeting.durationSeconds)}</span>
          <span aria-hidden>·</span>
          <span>
            {speakerCount} speaker{speakerCount === 1 ? '' : 's'}
          </span>
        </p>
      </button>
      <div className="flex justify-end border-t border-line px-3 py-2">
        {/* Two-step inline confirm (no modal); losing focus backs out of it. */}
        <Button
          size="sm"
          variant={confirmingDelete ? 'danger' : 'ghost'}
          onClick={onDelete}
          onBlur={onCancelDelete}
        >
          {confirmingDelete ? 'Confirm?' : 'Delete'}
        </Button>
      </div>
    </Card>
  );
}

function LoadingCards() {
  // Static placeholders — the only things that animate are live text and the recording dot.
  return (
    <div aria-hidden className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} padded={false} className="h-[148px] p-5">
          <div className="h-4 w-2/3 rounded-chip bg-sunken" />
          <div className="mt-3 h-3 w-1/3 rounded-chip bg-sunken" />
          <div className="mt-7 h-3 w-1/2 rounded-chip bg-sunken" />
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMeetings()
      .then((list) => {
        setMeetings(list);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Could not read your saved meetings.');
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleNewMeeting = useCallback(() => {
    router.push(`/meeting/${crypto.randomUUID()}`);
  }, [router]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (confirmingDeleteId !== id) {
        setConfirmingDeleteId(id);
        return;
      }
      setConfirmingDeleteId(null);
      try {
        await deleteMeeting(id);
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? `Could not delete the meeting: ${err.message}` : 'Could not delete the meeting.');
      }
    },
    [confirmingDeleteId, refresh, toast],
  );

  const handleRetry = () => {
    setLoadError(null);
    setMeetings(null);
    refresh();
  };

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-10 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Scribe</h1>
        <Button variant="primary" onClick={handleNewMeeting}>
          New meeting
        </Button>
      </header>

      <section className="mt-10" aria-label="Past meetings">
        {loadError ? (
          <Card className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
            <div className="flex flex-col gap-1.5">
              <p className="text-lg font-semibold text-fg">Couldn’t load your meetings</p>
              <p className="text-sm text-fg-secondary">{loadError}</p>
            </div>
            <Button variant="secondary" onClick={handleRetry}>
              Try again
            </Button>
          </Card>
        ) : meetings === null ? (
          <LoadingCards />
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-28 text-center">
            <p className="text-lg text-fg">No meetings yet. Start your first recording.</p>
            <Button variant="primary" onClick={handleNewMeeting}>
              New meeting
            </Button>
          </div>
        ) : (
          <>
            <p className="micro-label mb-4">
              {meetings.length} meeting{meetings.length === 1 ? '' : 's'}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meetings.map((meeting) => (
                <li key={meeting.id}>
                  <MeetingCard
                    meeting={meeting}
                    confirmingDelete={confirmingDeleteId === meeting.id}
                    onOpen={() => router.push(`/meeting/${meeting.id}`)}
                    onDelete={() => void handleDelete(meeting.id)}
                    onCancelDelete={() => setConfirmingDeleteId((current) => (current === meeting.id ? null : current))}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
