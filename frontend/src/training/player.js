export const TRAINING_SEGMENT_SECONDS = 2.4;
export const TRAINING_END_HOLD_SECONDS = 1.2;

/** Training playback policy only. The app owns boards, rendering and persistence. */
export function createTrainingPlayer({ frameCount, position = 0, requestFrame, cancelFrame, now, getSpeed = () => 1, getLoop = () => false, onFrame = () => {}, onComplete = () => {} }) {
  let count, current = 0, playing = false, endHold = 0, lastTime = 0, raf = null, generation = 0, destroyed = false;
  const checkedCount = value => { if (!Number.isInteger(value) || value < 1) throw new TypeError('训练播放需要有效步骤数'); return value; };
  const bounded = value => Number.isFinite(value) ? Math.max(0, Math.min(count - 1, value)) : 0;
  count = checkedCount(frameCount); current = bounded(position);
  if (![requestFrame, cancelFrame, now, getSpeed, getLoop, onFrame, onComplete].every(fn => typeof fn === 'function')) throw new TypeError('训练播放需要帧调度与回调');
  function state() {
    const stepIndex = Math.min(Math.floor(current), count - 1), fraction = current - stepIndex;
    const progress = playing ? Math.max(0, (fraction - .18) / .82) : fraction;
    return { playing, position: current, stepIndex, fraction, interpolation: playing ? progress * progress * (3 - 2 * progress) : progress, endHold, rafActive: raf !== null, frameCount: count };
  }
  function cancel() { generation++; if (raf !== null) cancelFrame(raf); raf = null; }
  function pause({ snap = true } = {}) {
    if (destroyed) return state();
    cancel(); playing = false;
    if (snap) current = Math.round(current);
    return state();
  }
  function schedule() {
    if (destroyed || !playing || raf !== null) return;
    const token = generation;
    raf = requestFrame(time => {
      if (destroyed || !playing || token !== generation) return;
      raf = null;
      const delta = Number.isFinite(time) ? Math.max(0, Math.min((time - lastTime) / 1000, .1)) : 0;
      if (Number.isFinite(time)) lastTime = time;
      const speed = Number(getSpeed()), rate = Number.isFinite(speed) ? Math.max(0, speed) : 0;
      current += delta * rate / TRAINING_SEGMENT_SECONDS;
      const last = count - 1;
      if (current >= last) {
        current = last;
        if (getLoop()) {
          // The original training hold scales with speed; card previews have
          // their own fixed 1000ms hold and intentionally use another clock.
          endHold += delta * rate;
          if (endHold >= TRAINING_END_HOLD_SECONDS) { current = 0; endHold = 0; }
        } else { pause(); onComplete(state()); return; }
      }
      onFrame(state());
      if (token === generation) schedule();
    });
  }
  return {
    play() {
      if (destroyed || playing || count < 2) return state();
      if (current >= count - 1) current = 0;
      cancel(); playing = true; endHold = 0; lastTime = now(); schedule(); return state();
    },
    pause,
    seek(value) { if (!destroyed) current = bounded(value); return state(); },
    load({ frameCount, position = 0 }) { if (destroyed) return state(); const nextCount = checkedCount(frameCount); pause({ snap: false }); count = nextCount; current = bounded(position); endHold = 0; return state(); },
    destroy() { if (destroyed) return; cancel(); playing = false; destroyed = true; },
    get playing() { return playing; }, get position() { return current; }, get state() { return state(); },
  };
}
