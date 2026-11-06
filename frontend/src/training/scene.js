import { appendWoodSurface } from '../board/appearance.js';

/** Independent full-card floor; the standard court SVG stays safe for export. */
export function createTrainingScene({ document }) {
  const panel = document.querySelector('.training-scene-card');
  const ns = 'http://www.w3.org/2000/svg';
  const create = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  };
  const surface = create('svg', { class: 'training-floor', 'aria-hidden': 'true', focusable: 'false', viewBox: '0 0 1000 1800', preserveAspectRatio: 'none' });
  appendWoodSurface(surface, create, 'training-scene-wood');
  const rectangles = [...surface.children].filter(node => node.tagName === 'rect');
  rectangles[0].remove();
  const floor = rectangles[1];
  floor.setAttribute('rx', '0');
  floor.setAttribute('height', '1800');
  panel.prepend(surface);
  const resize = () => {
    const { width, height } = panel.getBoundingClientRect();
    if (width <= 0 || height <= 0) return;
    const extent = 1000 * height / width;
    surface.setAttribute('viewBox', `0 0 1000 ${extent}`);
    floor.setAttribute('height', String(extent));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(panel);
  resize();
  return { destroy() { observer.disconnect(); surface.remove(); } };
}
