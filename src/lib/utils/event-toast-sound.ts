/**
 * Plays a short notification sound when a zone event toast is shown.
 * Uses Web Audio API so no external file is required.
 * Some browsers may block audio until user has interacted with the page.
 */
export function playEventToastSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore if AudioContext is not supported or blocked (e.g. autoplay policy)
  }
}
