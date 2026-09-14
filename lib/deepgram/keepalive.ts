// Deepgram closes an idle connection after ~10s without audio or a
// KeepAlive message. During a pause we stop forwarding audio but keep the
// socket open (PLAN.md section 6) — this ping keeps it alive comfortably
// under that timeout.
const KEEPALIVE_INTERVAL_MS = 5000;

/** Starts sending KeepAlive frames on `socket`. Returns a function that stops them. */
export function startKeepAlive(socket: WebSocket): () => void {
  const interval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'KeepAlive' }));
    }
  }, KEEPALIVE_INTERVAL_MS);

  return () => clearInterval(interval);
}
