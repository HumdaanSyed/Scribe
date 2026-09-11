// AudioWorkletProcessor that converts the incoming Float32 audio stream to
// PCM16 and posts it to the main thread in fixed-size chunks.
//
// Plain JS (not TS) — this file runs in the AudioWorkletGlobalScope, which
// is a separate realm from the page and cannot be transpiled the same way.

const BUFFER_SIZE = 4096;

class PCM16Processor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(BUFFER_SIZE);
    this._bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];

    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this._buffer[this._bufferIndex++] = channel[i];

        if (this._bufferIndex === BUFFER_SIZE) {
          this._flush();
        }
      }
    }

    // Returning true keeps the processor alive for the life of the node.
    return true;
  }

  _flush() {
    const pcm16 = new Int16Array(BUFFER_SIZE);

    for (let i = 0; i < BUFFER_SIZE; i++) {
      const clamped = Math.max(-1, Math.min(1, this._buffer[i]));
      pcm16[i] = clamped * 0x7fff;
    }

    // Transfer the underlying ArrayBuffer to avoid copying it.
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    this._bufferIndex = 0;
  }
}

registerProcessor('audio-processor', PCM16Processor);
