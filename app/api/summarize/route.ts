import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { streamResponse } from '@/lib/anthropic/streamResponse';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You write structured meeting notes from a transcript. Output valid Markdown with exactly these sections, in this order:

## Overview
2-3 sentences summarizing what the meeting was about.

## Key points discussed
Bullet points covering the substantive topics discussed.

## Decisions made
Bullet points of decisions made during the meeting. If none were made, write exactly: None recorded.

## Action items
Bullet points, one per action item, formatted as "Task — Owner: <owner>, Deadline: <deadline>". If the owner or deadline was not specified in the transcript, write "Not specified" for that field.

Ground everything strictly in the transcript. Never invent names, numbers, dates, or commitments that were not actually said. Ignore small talk and off-topic chatter.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const transcript = body?.transcript;
  if (typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'Missing transcript.' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    });

    return streamResponse(stream);
  } catch (err) {
    console.error('Failed to start summary stream', err);
    return NextResponse.json({ error: 'Could not generate a summary.' }, { status: 502 });
  }
}
