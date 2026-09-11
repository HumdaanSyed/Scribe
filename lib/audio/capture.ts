// Acquiring raw media streams. Mixing them together happens in mixer.ts.

/**
 * Requests microphone access and returns the resulting stream.
 * Throws (with the browser's own message, e.g. permission denied) if the
 * user declines or no input device is available.
 */
export async function getMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

/** Stops every track on a stream, releasing the OS-level capture indicator. */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
