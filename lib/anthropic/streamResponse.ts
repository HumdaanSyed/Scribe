import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream';

/**
 * Wraps a Claude MessageStream as a plain UTF-8 text HTTP response — the
 * client doesn't need the SDK at all, just a plain fetch + reader loop
 * (PLAN.md section 9: "Stream the response back and render it
 * progressively").
 */
export function streamResponse(anthropicStream: MessageStream): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      anthropicStream.on('text', (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      anthropicStream.on('end', () => {
        controller.close();
      });
      anthropicStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      anthropicStream.abort();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
