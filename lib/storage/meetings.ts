import { getDB } from './db';
import type { Meeting } from '@/lib/transcript/model';

export async function saveMeeting(meeting: Meeting): Promise<void> {
  const db = await getDB();
  await db.put('meetings', meeting);
}

export async function getMeeting(id: string): Promise<Meeting | undefined> {
  const db = await getDB();
  return db.get('meetings', id);
}

/** Past meetings, newest first. */
export async function listMeetings(): Promise<Meeting[]> {
  const db = await getDB();
  const meetings = await db.getAllFromIndex('meetings', 'by-createdAt');
  return meetings.reverse();
}

export async function deleteMeeting(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('meetings', id);
}
