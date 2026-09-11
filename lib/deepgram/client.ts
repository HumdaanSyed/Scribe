/** Fetches a fresh short-lived Deepgram token from our server route. */
export async function fetchDeepgramToken(): Promise<string> {
  const response = await fetch('/api/deepgram/token');

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? 'Could not get a Deepgram token.');
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}
