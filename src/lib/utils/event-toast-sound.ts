/**
 * Plays a short notification sound when a zone event toast is shown (repeats twice).
 * Uses Web Audio API so no external file is required.
 * Some browsers may block audio until user has interacted with the page.
 */
function playOneBeep(ctx: AudioContext, startTime: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.15, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
  osc.start(startTime);
  osc.stop(startTime + 0.15);
}

export function playEventToastSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t0 = ctx.currentTime;
    playOneBeep(ctx, t0);
    playOneBeep(ctx, t0 + 0.25);
  } catch {
    // Ignore if AudioContext is not supported or blocked (e.g. autoplay policy)
  }
}
