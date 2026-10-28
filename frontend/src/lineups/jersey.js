const SVG_NS = 'http://www.w3.org/2000/svg';

export const NEUTRAL_KIT = Object.freeze({ base: '#B9C8D3', trim: '#F3F7FA', secondary: '#6F8799', text: '#294B62', wordmark: 'YOUR TEAM' });

function shade(hex, amount) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const rgb = [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16));
  return `#${rgb.map(value => Math.round(amount >= 0 ? value + (255 - value) * amount : value * (1 + amount)).toString(16).padStart(2, '0')).join('')}`;
}

/** Local SVG cloth; team identity never changes the surrounding workspace. */
export function createJerseySvg({ document, team = null, number, name = '', idPrefix }) {
  const kit = team?.jersey || NEUTRAL_KIT;
  const create = (tag, attributes = {}, text) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const svg = create('svg', { viewBox: '0 0 90 132', role: 'img', 'aria-label': `${name || '队员'}，球衣 ${number} 号，${team?.fullName || '未选择 NBA 球队'}` });
  svg.dataset.teamId = team?.id || ''; svg.dataset.number = String(number);
  const gradientId = `${idPrefix}-fabric`, clipId = `${idPrefix}-clip`, clothId = `${idPrefix}-weave`;
  const shape = 'M27 4 12 11Q19 29 8 42L11 125H79L82 42Q71 29 78 11L63 4Q45 22 27 4Z';
  const defs = create('defs'), gradient = create('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 1, y2: 1 });
  [[0, .2], [.32, -.08], [.57, .1], [1, -.24]].forEach(([offset, amount]) => gradient.append(create('stop', { offset, 'stop-color': shade(kit.base, amount) })));
  const cloth = create('pattern', { id: clothId, width: 3, height: 3, patternUnits: 'userSpaceOnUse' });
  cloth.append(create('path', { d: 'M0 0H3M0 1.5H3', stroke: '#FFFFFF', 'stroke-width': .35, opacity: .14 }), create('path', { d: 'M0 0V3M1.5 0V3', stroke: '#142E40', 'stroke-width': .25, opacity: .12 }));
  const clip = create('clipPath', { id: clipId }); clip.append(create('path', { d: shape })); defs.append(gradient, cloth, clip); svg.append(defs);
  svg.append(create('path', { d: shape, fill: `url(#${gradientId})`, stroke: shade(kit.base, -.4), 'stroke-width': 1.7, 'stroke-linejoin': 'round' }));
  const folds = create('g', { 'clip-path': `url(#${clipId})` });
  folds.append(create('rect', { width: 90, height: 132, fill: `url(#${clothId})` }));
  folds.append(create('path', { d: 'M20 27 16 118M33 34 28 124M59 31 67 123M73 45 76 119', stroke: '#142B3B', opacity: .19, 'stroke-width': 4 }), create('path', { d: 'M24 29 21 120M36 36 33 125M56 35 62 122', stroke: '#FFFFFF', opacity: .23, 'stroke-width': 1.7 })); svg.append(folds);
  svg.append(create('path', { d: 'M27 4Q45 31 63 4M13 13Q23 29 12 44M77 13Q67 29 78 44', fill: 'none', stroke: kit.trim, 'stroke-width': 4 }));
  svg.append(create('path', { d: 'M29 8Q45 31 61 8M17 47 20 118M73 47 70 118M13 120H77', fill: 'none', stroke: kit.secondary, 'stroke-width': 1.5 }));
  svg.append(create('text', { x: 45, y: 48, 'text-anchor': 'middle', fill: kit.text, 'font-family': 'system-ui', 'font-size': 9, 'font-weight': 850, textLength: 55, lengthAdjust: 'spacingAndGlyphs', 'data-jersey-wordmark': 'true' }, kit.wordmark));
  svg.append(create('text', { x: 45, y: 91, 'text-anchor': 'middle', fill: kit.text, stroke: kit.secondary, 'stroke-width': .55, 'font-family': 'system-ui', 'font-size': 39, 'font-weight': 850, 'data-jersey-number': 'true' }, number));
  const nickname = create('text', { x: 45, y: 111, 'text-anchor': 'middle', fill: kit.text, 'font-family': 'system-ui', 'font-size': 7, 'font-weight': 650, 'data-jersey-name': 'true' }, name);
  if (Array.from(name).length > 8) { nickname.setAttribute('textLength', '54'); nickname.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
  svg.append(nickname);
  return svg;
}
