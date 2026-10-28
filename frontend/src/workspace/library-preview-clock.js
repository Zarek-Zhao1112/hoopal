export const LIBRARY_PREVIEW_SEGMENT_MS = 2400;
export const LIBRARY_PREVIEW_HOLD_MS = 1000;

/** Millisecond clock shared by the card runtime. No scheduling or DOM access. */
export function createPreviewClock(frameCount) {
  if (!Number.isInteger(frameCount) || frameCount < 1) throw new TypeError('预览需要至少一个完整步骤');
  const last = frameCount - 1, end = last * LIBRARY_PREVIEW_SEGMENT_MS;
  let elapsed = 0, hold = 0, cycle = 0;
  function state() {
    const position = elapsed / LIBRARY_PREVIEW_SEGMENT_MS;
    const stepIndex = Math.min(last, Math.floor(position));
    const fraction = position - stepIndex;
    const moving = Math.max(0, (fraction - .18) / .82);
    return {
      position, progress: last ? position / last : 1, stepIndex, fraction,
      interpolation: moving * moving * (3 - 2 * moving), cycle,
      atEnd: elapsed >= end, holdElapsedMs: hold,
      holdRemaining: Math.max(0, LIBRARY_PREVIEW_HOLD_MS - hold),
    };
  }
  return {
    advance(delta) {
      const bounded = Number.isFinite(delta) ? Math.max(0, Math.min(100, delta)) : 0;
      if (elapsed < end) { elapsed = Math.min(end, elapsed + bounded); if (elapsed === end) hold = 0; }
      else {
        hold += bounded;
        if (hold >= LIBRARY_PREVIEW_HOLD_MS) { elapsed = 0; hold = 0; cycle++; }
      }
      return state();
    },
    reset() { elapsed = 0; hold = 0; cycle = 0; return state(); },
    get state() { return state(); },
  };
}
