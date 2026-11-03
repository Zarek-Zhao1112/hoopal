export function createBodyFigures({ document, mode, type }) {
  const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 220 130'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('body-type-figures');
    const count = mode === '3v3' ? 3 : 4, sizes = [...Array(type.largeCount).fill('large'), ...Array(type.smallCount).fill('small'), ...Array(type.equalCount).fill('equal')];
    const width = count === 4 ? 46 : 59, offset = count === 4 ? 25 : 32;
    sizes.forEach((size, index) => {
      const h = size === 'large' ? 106 : size === 'small' ? 76 : 91, w = size === 'large' ? 34 : size === 'small' ? 25 : 29;
      const x = offset + index * width, y = 121 - h;
      const g = document.createElementNS(NS, 'g'); g.dataset.figureSize = size;
      const shape = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); g.append(n); return n; };
      shape('ellipse', { cx: x, cy: 124, rx: w * .66, ry: 3, fill: '#a4bfd044' });
      shape('circle', { cx: x, cy: y + h * .105, r: h * .085, fill: '#5d99c0', stroke: '#3d7fa6', 'stroke-width': 1 });
      const shoulder = y + h * .24, waist = y + h * .63;
      shape('path', { d: `M${x - w * .32},${shoulder} L${x - w * .55},${shoulder + 6} L${x - w * .65},${waist - 3} Q${x - w * .7},${waist + 4} ${x - w * .45},${waist + 3} L${x - w * .24},${shoulder + h * .12} L${x - w * .29},${waist} L${x + w * .29},${waist} L${x + w * .24},${shoulder + h * .12} L${x + w * .45},${waist + 3} Q${x + w * .7},${waist + 4} ${x + w * .65},${waist - 3} L${x + w * .55},${shoulder + 6} L${x + w * .32},${shoulder} Q${x},${shoulder + 5} ${x - w * .32},${shoulder}Z`, fill: '#6ca7ca', stroke: '#4a8eb8', 'stroke-width': 1 });
      shape('path', { d: `M${x - w * .29},${waist - 2} L${x - w * .32},${waist + h * .17} L${x - w * .08},${waist + h * .17} L${x},${waist + h * .06} L${x + w * .08},${waist + h * .17} L${x + w * .32},${waist + h * .17} L${x + w * .29},${waist - 2}Z`, fill: '#c6e1f0', stroke: '#75a5c3', 'stroke-width': .8 });
      for (const side of [-1, 1]) shape('path', { d: `M${x + side * w * .2},${waist + h * .15} L${x + side * w * .15},120 L${x + side * w * .39},121 L${x + side * w * .33},125 L${x + side * w * .07},125 L${x + side * w * .04},${waist + h * .15}Z`, fill: '#5b96bb' });
      svg.append(g);
    }); return svg;
  }
