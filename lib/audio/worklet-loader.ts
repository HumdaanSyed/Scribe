const WORKLET_MODULE_URL = '/audio-processor.js';
export const AUDIO_PROCESSOR_NAME = 'audio-processor';

/**
 * Registers the PCM16 worklet processor on the given AudioContext.
 * `addModule` must be called once per AudioContext instance (a fresh
 * context after teardown needs the module loaded again).
 */
export function loadAudioWorklet(audioContext: AudioContext): Promise<void> {
  return audioContext.audioWorklet.addModule(WORKLET_MODULE_URL);
}
