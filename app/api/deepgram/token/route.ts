import { NextResponse } from 'next/server';
import { DeepgramClient } from '@deepgram/sdk';

// Always mint a fresh token — never let this route handler's response be cached.
export const dynamic = 'force-dynamic';

/**
 * Mints a short-lived Deepgram access token (usage:write only) that the
 * client can use to open a Deepgram WebSocket connection directly, without
 * ever seeing DEEPGRAM_API_KEY. Client fetches this immediately before
 * opening each connection.
 */
export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  try {
    const client = new DeepgramClient({ apiKey });
    const { access_token: token } = await client.auth.v1.tokens.grant({ ttl_seconds: 60 });

    return NextResponse.json({ token });
  } catch (err) {
    console.error('Failed to mint Deepgram token', err);
    return NextResponse.json({ error: 'Could not mint a Deepgram token.' }, { status: 502 });
  }
}
