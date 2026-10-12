let context: AudioContext | null = null;
let enabled = true;
function getContext(): AudioContext | null {
  if (typeof window === "undefined" || !enabled) return null;
  try { context ??= new window.AudioContext(); if (context.state === "suspended") void context.resume(); return context; }
  catch { return null; }
}
function tone(frequency: number, duration: number, type: OscillatorType = "sine", volume = .045, delay = 0): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
    gain.gain.setValueAtTime(.001, ctx.currentTime + delay); gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + .012);
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + delay + duration);
    oscillator.connect(gain).connect(ctx.destination); oscillator.start(ctx.currentTime + delay); oscillator.stop(ctx.currentTime + delay + duration + .02);
  } catch { /* Audio can be unavailable in embedded browsers. */ }
}
function noiseBurst(): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const length = Math.max(1, Math.floor(ctx.sampleRate * .08)); const buffer = ctx.createBuffer(1, length, ctx.sampleRate); const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length);
    const source = ctx.createBufferSource(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
    filter.type = "bandpass"; filter.frequency.value = 1800; filter.Q.value = .7; gain.gain.value = .08;
    source.buffer = buffer; source.connect(filter).connect(gain).connect(ctx.destination); source.start();
  } catch { /* Audio can be unavailable in embedded browsers. */ }
}
let ringTimer: number | null = null;
export const sfx = {
  unlock(): void { const ctx = getContext(); if (ctx && ctx.state === "suspended") void ctx.resume(); },
  setEnabled(value: boolean): void { enabled = value; if (!value && ringTimer !== null && typeof window !== "undefined") { window.clearInterval(ringTimer); ringTimer = null; } },
  crunch(): void { noiseBurst(); tone(120, .11, "sine", .045); },
  pop(): void { tone(520, .08, "sine", .035); },
  send(): void { tone(460, .07, "triangle", .035); tone(690, .09, "sine", .025, .045); },
  tick(): void { tone(980, .035, "sine", .018); },
  react(): void { tone(660, .12, "sine", .025); tone(880, .14, "sine", .023, .075); tone(1175, .18, "sine", .02, .15); },
  ding(): void { tone(880, .18, "sine", .035); tone(1175, .22, "sine", .025, .1); },
  ring(): () => void {
    if (typeof window === "undefined" || !enabled) return () => undefined;
    const play = () => { tone(660, .3, "sine", .03); tone(880, .3, "sine", .03, .32); };
    play(); ringTimer = window.setInterval(play, 1800);
    return () => { if (ringTimer !== null) window.clearInterval(ringTimer); ringTimer = null; };
  },
  hangup(): void { tone(440, .11, "sine", .03); tone(280, .17, "sine", .025, .08); },
};
