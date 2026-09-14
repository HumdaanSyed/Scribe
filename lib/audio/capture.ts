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

/**
 * Thrown when getDisplayMedia resolved but the shared source has no audio
 * track — the user shared a screen/window instead of a tab, or shared a
 * tab without ticking "Share tab audio" (PLAN.md section 4).
 */
export class NoTabAudioError extends Error {
  constructor() {
    super(
      'No audio in the shared source. In the picker, choose the "Chrome Tab" tab and enable "Share tab audio".',
    );
    this.name = 'NoTabAudioError';
  }
}

/**
 * Captures system/tab audio via getDisplayMedia. Chrome rejects an
 * audio-only display capture request, so video must be requested too — its
 * track is stopped and removed immediately so no video is ever captured or
 * transmitted. Throws NoTabAudioError if the shared source has no audio.
 */
export async function getDisplayAudioStream(): Promise<MediaStream> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

  displayStream.getVideoTracks().forEach((track) => {
    track.stop();
    displayStream.removeTrack(track);
  });

  if (displayStream.getAudioTracks().length === 0) {
    stopStream(displayStream);
    throw new NoTabAudioError();
  }

  return displayStream;
}
