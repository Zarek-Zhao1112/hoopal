import { interpolateBoards, validatePlay } from '../../../shared/engine.js';
import { createLibraryCourt } from '../board/court-renderer.js';
import { createPreviewClock } from './library-preview-clock.js';

let previewSequence = 0;

/** A single real-template animation inside a UI-owned button. No persistence. */
export function createLibraryPreview({ template, button }) {
  const document = button?.ownerDocument, window = document?.defaultView;
  if (!window || typeof template?.build !== 'function') throw new TypeError('卡片预览需要内置模板与按钮');
  const play = validatePlay(template.build()), frames = play.frames, clock = createPreviewClock(frames.length);
  const id = `library-preview-${++previewSequence}`;
  const court = createLibraryCourt({ document, template, board: frames[0], surfaceId: id }), svg = court.element;
  const status = document.createElement('span'), bar = document.createElement('span');
  status.className = 'corner-status'; bar.className = 'preview-progress';
  status.setAttribute('aria-hidden', 'true'); bar.setAttribute('aria-hidden', 'true');
  button.replaceChildren(svg, status, bar);
  let playing = false, destroyed = false, raf = null, lastTime = null, generation = 0;
  const available = () => !destroyed && !button.disabled && button.isConnected && !document.hidden && !button.closest?.('[hidden]');
  function sample() {
    const state = clock.state, from = frames[state.stepIndex], to = frames[Math.min(frames.length - 1, state.stepIndex + 1)];
    const board = state.fraction > 0 ? interpolateBoards(from, to, state.interpolation) : from;
    return { ...state, from, to, board };
  }
  function state() {
    const current = sample();
    return { previewId: template.id, playing, progress: current.progress, position: current.position, cycle: current.cycle, stepIndex: current.stepIndex, interpolation: current.interpolation, phase: playing ? current.atEnd ? 'hold' : 'playing' : 'paused', holderId: current.board.ball.holderId || '', rafCount: raf === null ? 0 : 1, holdRemaining: current.holdRemaining, holdElapsedMs: current.holdElapsedMs, destroyed };
  }
  function publish() {
    const value = state();
    for (const key of ['previewId', 'playing', 'progress', 'cycle', 'stepIndex', 'phase', 'holderId', 'rafCount', 'holdRemaining', 'position', 'interpolation']) button.dataset[key] = String(value[key]);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? '暂停' : '继续'}${template.title}的卡片预览`);
    status.textContent = playing ? 'Ⅱ 循环播放' : '▶ 已暂停';
    bar.style.transform = `scaleX(${value.progress})`;
  }
  function paint() {
    const current = sample();
    court.draw(current);
    publish();
  }
  function cancelFrame() {
    generation++;
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null; lastTime = null;
  }
  function schedule() {
    if (!playing || destroyed || raf !== null) return;
    const token = generation;
    raf = window.requestAnimationFrame(time => {
      // A cancelled callback can still be delivered. It must never clear the
      // newer generation's rAF handle or schedule a second live loop.
      if (token !== generation || destroyed || !playing) return;
      raf = null;
      if (!available()) { pause(); return; }
      const finite = Number.isFinite(time);
      const delta = lastTime === null || !finite ? 0 : Math.max(0, Math.min(100, time - lastTime));
      if (finite) lastTime = lastTime === null ? time : Math.max(lastTime, time);
      clock.advance(delta); paint(); schedule();
    });
    publish();
  }
  function start() {
    if (!available() || playing) return state();
    cancelFrame(); playing = true; paint(); schedule(); return state();
  }
  function pause() { if (destroyed) return state(); cancelFrame(); playing = false; paint(); return state(); }
  function reset() { if (destroyed) return state(); cancelFrame(); playing = false; clock.reset(); paint(); return state(); }
  const toggle = () => { if (available()) playing ? pause() : start(); };
  const visibility = () => { if (document.hidden) pause(); };
  const pagehide = () => pause();
  button.addEventListener('click', toggle); document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
  paint();
  return {
    start, pause, reset,
    destroy() {
      if (destroyed) return;
      cancelFrame(); playing = false; destroyed = true;
      button.removeEventListener('click', toggle); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide);
      publish();
    },
    get state() { return state(); },
  };
}
