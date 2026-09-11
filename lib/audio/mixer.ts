// Combines one or more MediaStreams into a single mixed stream using Web
// Audio's automatic summing at a MediaStreamAudioDestinationNode. Phase 1
// only ever passes a single (mic) stream through here; Phase 5 adds a
// second (display/tab) stream without changing this function.

/** Creates the 16kHz AudioContext the whole capture pipeline runs on. */
export function createAudioContext(): AudioContext {
  return new AudioContext({ sampleRate: 16000 });
}

export interface MixResult {
  /** The combined stream — feed this into the AudioWorklet source node. */
  destination: MediaStreamAudioDestinationNode;
  /** Kept so callers can disconnect them individually on teardown. */
  sourceNodes: MediaStreamAudioSourceNode[];
}

export function mixStreams(audioContext: AudioContext, streams: MediaStream[]): MixResult {
  const destination = audioContext.createMediaStreamDestination();

  const sourceNodes = streams.map((stream) => {
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(destination);
    return source;
  });

  return { destination, sourceNodes };
}
