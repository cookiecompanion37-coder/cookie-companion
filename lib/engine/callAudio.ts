export class CallAudioPlayer {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private nextStart = 0;
  private sources = new Set<AudioBufferSourceNode>();

  get playing(): boolean {
    return this.context !== null && this.context.currentTime < this.nextStart;
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  setEnabled(enabled: boolean): void {
    if (this.gain) this.gain.gain.value = enabled ? 1 : 0;
  }

  play(bytes: ArrayBuffer, sampleRate = 24000): void {
    const context = this.context;
    if (!context || !this.gain || bytes.byteLength < 2 || bytes.byteLength % 2) return;
    const pcm = new Int16Array(bytes);
    const buffer = context.createBuffer(1, pcm.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < pcm.length; index++) channel[index] = pcm[index] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);
    const start = Math.max(context.currentTime, this.nextStart);
    // Bound stale audio rather than letting slow connections build seconds of lag.
    if (start - context.currentTime > 3) return;
    this.nextStart = start + buffer.duration;
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); source.disconnect(); };
    source.start(start);
  }

  close(): void {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    if (this.context) void this.context.close();
    this.context = null;
    this.gain = null;
    this.nextStart = 0;
  }
}
