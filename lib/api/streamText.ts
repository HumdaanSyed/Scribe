/**
 * POSTs `body` to `url` and calls `onDelta` with each UTF-8 text chunk as it
 * streams back. The route handlers on the other end forward Claude's text
 * deltas as a plain text stream (see app/api/summarize and app/api/chat).
 */
export async function streamText(
  url: string,
  body: unknown,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error ?? `Request failed (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}
