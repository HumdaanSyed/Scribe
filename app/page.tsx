'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMeeting, listMeetings } from '@/lib/storage/meetings';
import type { Meeting } from '@/lib/transcript/model';
import { formatTimestamp } from '@/lib/transcript/formatting';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

// TEMPORARY styling. This is the real Home/History screen (PLAN.md section
// 12) — Phase 9 applies the full design system on top of this structure.
export default function Home() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listMeetings().then(setMeetings);
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
      await deleteMeeting(id);
      setConfirmingDeleteId(null);
      refresh();
    },
    [confirmingDeleteId, refresh],
  );

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Scribe</h1>
        <button
          onClick={handleNewMeeting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New meeting
        </button>
      </div>

      <div className="mt-8">
        {meetings === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <p className="text-sm text-gray-500">No meetings yet — start your first recording.</p>
            <button
              onClick={handleNewMeeting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              New meeting
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {meetings.map((meeting) => {
              const speakerCount = Object.keys(meeting.speakers).length;
              const confirming = confirmingDeleteId === meeting.id;

              return (
                <li
                  key={meeting.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <button
                    onClick={() => router.push(`/meeting/${meeting.id}`)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {formatDate(meeting.createdAt)} · {formatTimestamp(meeting.durationSeconds)} ·{' '}
                      {speakerCount} speaker{speakerCount === 1 ? '' : 's'}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    className={
                      confirming
                        ? 'flex-shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700'
                        : 'flex-shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50'
                    }
                  >
                    {confirming ? 'Confirm?' : 'Delete'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
