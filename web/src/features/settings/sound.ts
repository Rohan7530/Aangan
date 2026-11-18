// "Play a sound for new messages": a soft two-note chime made with Web Audio
// (no audio file). On by default; stored per person on this browser.
const key = (userId: string) => `aangan.sound.${userId}`;

export function isSoundOn(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(userId: string, on: boolean): void {
  try {
    localStorage.setItem(key(userId), on ? 'on' : 'off');
  } catch {
    // ignore
  }
}

let ctx: AudioContext | null = null;
let lastPlayed = 0;

export function playChime(): void {
  const now = Date.now();
  if (now - lastPlayed < 1500) return; // a burst of messages rings once
  lastPlayed = now;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t0 + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    (window as unknown as { __aanganChimes?: number }).__aanganChimes = ((window as unknown as { __aanganChimes?: number }).__aanganChimes ?? 0) + 1;
  } catch {
    // no audio available
  }
}
