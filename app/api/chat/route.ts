import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { streamResponse } from '@/lib/anthropic/streamResponse';

export const dynamic = 'force-dynamic';

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

function isChatMessage(value: unknown): value is ChatMessageInput {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (v.role === 'user' || v.role === 'assistant') && typeof v.content === 'string';
}

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
  const history = body?.history;

  if (typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'Missing transcript.' }, { status: 400 });
  }
  if (!Array.isArray(history) || history.length === 0 || !history.every(isChatMessage)) {
    return NextResponse.json({ error: 'Missing chat history.' }, { status: 400 });
  }
  if (history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'The last chat message must be from the user.' }, { status: 400 });
  }

  const systemPrompt = `You answer questions about a meeting, using ONLY the transcript below. Be concise and direct. If the transcript does not contain the answer, say so plainly rather than speculating or guessing.

Transcript:
${transcript}`;

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history.map((m: ChatMessageInput) => ({ role: m.role, content: m.content })),
    });

    return streamResponse(stream);
  } catch (err) {
    console.error('Failed to start chat stream', err);
    return NextResponse.json({ error: 'Could not get a response.' }, { status: 502 });
  }
}
