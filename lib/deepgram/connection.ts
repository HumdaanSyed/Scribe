import { fetchDeepgramToken } from './client';

const DEEPGRAM_LISTEN_URL =
  'wss://api.deepgram.com/v1/listen' +
  '?model=nova-3' +
  '&language=multi' +
  '&encoding=linear16' +
  '&sample_rate=16000' +
  '&channels=1' +
  '&diarize=true' +
  '&punctuate=true' +
  '&smart_format=true' +
  '&interim_results=true';

export interface DeepgramWord {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  speaker?: number;
}

export interface DeepgramResultsMessage {
  type: 'Results';
  is_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      words: DeepgramWord[];
    }>;
  };
}

function isResultsMessage(message: { type?: string }): message is DeepgramResultsMessage {
  return message.type === 'Results';
}

export interface DeepgramConnectionHandlers {
  onOpen?: () => void;
  onResults: (message: DeepgramResultsMessage) => void;
  onError?: (error: unknown) => void;
  onClose?: (event: CloseEvent) => void;
}

/**
 * Fetches a scoped token and opens the Deepgram streaming WebSocket,
 * authenticating via the `token` subprotocol (PLAN.md section 5).
 */
export async function openDeepgramConnection(
  handlers: DeepgramConnectionHandlers,
): Promise<WebSocket> {
  const token = await fetchDeepgramToken();
  // Our token route mints a JWT access token (auth.v1.tokens.grant), which
  // authenticates via the "bearer" subprotocol — not "token", which is only
  // for raw Deepgram API keys.
  const socket = new WebSocket(DEEPGRAM_LISTEN_URL, ['bearer', token]);

  socket.addEventListener('open', () => handlers.onOpen?.());

  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data as string) as { type?: string };
      if (isResultsMessage(message)) {
        handlers.onResults(message);
      }
    } catch (err) {
      handlers.onError?.(err);
    }
  });

  socket.addEventListener('error', (event) => handlers.onError?.(event));
  socket.addEventListener('close', (event) => handlers.onClose?.(event));

  return socket;
}

/** Sends one binary PCM16 frame. No-op if the socket isn't open yet. */
export function sendAudioChunk(socket: WebSocket, chunk: ArrayBuffer): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(chunk);
  }
}
