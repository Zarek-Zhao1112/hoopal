export const STARTUP_TIMING = Object.freeze({ holdMs: 1000, expandMs: 1100, revealMs: 300, titleStart: 1165, titleEnd: 1825 });
export const STARTUP_DURATION = STARTUP_TIMING.holdMs + STARTUP_TIMING.expandMs + STARTUP_TIMING.revealMs;

const smooth = value => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

/** Pure progress for the approved 1000ms hold / 1100ms expansion / 300ms reveal. */
export function startupProgress(value) {
  const timeMs = typeof value === 'number' && !Number.isNaN(value) ? Math.max(0, Math.min(STARTUP_DURATION, value)) : 0;
  const expansion = smooth((timeMs - STARTUP_TIMING.holdMs) / STARTUP_TIMING.expandMs);
  const titleOpacity = 1 - smooth((timeMs - STARTUP_TIMING.titleStart) / (STARTUP_TIMING.titleEnd - STARTUP_TIMING.titleStart));
  const reveal = smooth((timeMs - STARTUP_TIMING.holdMs - STARTUP_TIMING.expandMs) / STARTUP_TIMING.revealMs);
  return { timeMs, expansion, titleOpacity, titleOffset: -34 * (1 - titleOpacity) || 0, sceneScale: 1.13 - .13 * expansion, reveal, overlayOpacity: 1 - reveal };
}

/** Injected frame clock; no document, storage, background policy or replay. */
export function createStartupTimeline({ requestFrame, cancelFrame, onUpdate = () => {}, onComplete = () => {} } = {}) {
  if (typeof requestFrame !== 'function' || typeof cancelFrame !== 'function' || typeof onUpdate !== 'function' || typeof onComplete !== 'function') throw new TypeError('启动时钟需要帧调度和回调函数');
  let timeMs = 0, playing = false, completed = false, destroyed = false;
  let frame = null, lastTimestamp = null, generation = 0;
  const getState = () => ({ timeMs, playing, rafActive: frame !== null, completed });
  function stop() {
    generation++;
    if (frame !== null) cancelFrame(frame);
    frame = null; playing = false; lastTimestamp = null;
  }
  function finish() {
    if (destroyed || completed) return;
    stop(); timeMs = STARTUP_DURATION; completed = true;
    onUpdate(startupProgress(timeMs));
    if (!destroyed) onComplete();
  }
  function schedule(token) {
    if (destroyed || completed || !playing || token !== generation || frame !== null) return;
    frame = requestFrame(timestamp => {
      if (destroyed || completed || !playing || token !== generation) return;
      frame = null;
      if (Number.isFinite(timestamp)) {
        if (lastTimestamp === null) lastTimestamp = timestamp;
        else if (timestamp >= lastTimestamp) {
          timeMs = Math.min(STARTUP_DURATION, timeMs + timestamp - lastTimestamp);
          lastTimestamp = timestamp;
        }
      }
      if (timeMs >= STARTUP_DURATION) { finish(); return; }
      onUpdate(startupProgress(timeMs));
      schedule(token);
    });
  }
  return {
    play() {
      if (destroyed || completed || playing) return;
      playing = true; lastTimestamp = null;
      const token = ++generation;
      onUpdate(startupProgress(timeMs)); schedule(token);
    },
    pause() { if (!destroyed) stop(); },
    finish,
    destroy() { if (!destroyed) { stop(); destroyed = true; } },
    getState,
  };
}
