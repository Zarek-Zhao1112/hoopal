// Explicit SVG colors and plank seams also survive standalone PNG export.
export const COURT_COLORS = {
  surround: '#D2B28B', floor: '#E7CBA7', key: '#809CAF', marking: '#FFFFFF',
  line: '#FFFFFF', lineEdge: '#5D798D', attack: '#F47A3C', defense: '#4C91C5', defenseRoute: '#235C87',
  run: '#305D59', pass: '#A64624', dribble: '#305D59', screen: '#425D72',
  ink: '#15334B', muted: '#49657A', exportBackground: '#E8F2F8', exportText: '#173D5C',
};

export function appendWoodSurface(svg, create, id, inset = false) {
  const defs = create('defs');
  const pattern = create('pattern', { id, width: 120, height: 360, patternUnits: 'userSpaceOnUse' });
  pattern.append(
    create('rect', { width: 120, height: 360, fill: COURT_COLORS.floor }),
    create('rect', { width: 40, height: 360, fill: '#F7E5C9', opacity: .4 }),
    create('rect', { x: 80, width: 40, height: 360, fill: '#D8B48B', opacity: .18 }),
    create('path', { d: 'M0 0V360M40 0V360M80 0V360M0 110H40M40 260H80M80 55H120', fill: 'none', stroke: '#9D7C57', 'stroke-width': .9, opacity: .28 }),
    create('path', { d: 'M12 0Q7 90 13 180T12 360M27 0Q32 120 26 230T27 360M54 0Q60 95 53 210T54 360M69 0Q64 130 70 250T69 360M93 0Q99 120 92 230T93 360M108 0Q103 100 109 240T108 360', fill: 'none', stroke: '#A9865E', 'stroke-width': .7, opacity: .12 }),
  );
  defs.append(pattern);
  for (const [team, light, base, edge] of [
    ['attack', '#FFA96D', COURT_COLORS.attack, '#D96128'],
    ['defense', '#88BFDF', COURT_COLORS.defense, '#3475A3'],
  ]) {
    const face = create('radialGradient', { id: `${id}-${team}-face`, cx: '30%', cy: '22%', r: '80%' });
    face.append(create('stop', { offset: '0%', 'stop-color': light }), create('stop', { offset: '55%', 'stop-color': base }), create('stop', { offset: '100%', 'stop-color': edge }));
    defs.append(face);
  }
  const shadow = create('filter', { id: `${id}-piece-shadow`, x: '-50%', y: '-100%', width: '200%', height: '300%' });
  shadow.append(create('feGaussianBlur', { stdDeviation: 2.8 }));
  defs.append(shadow);
  svg.append(defs, create('rect', { width: 1000, height: 820, rx: 20, fill: COURT_COLORS.surround }));
  svg.append(create('rect', { x: inset ? 70 : 0, y: inset ? 70 : 0, width: inset ? 860 : 1000, height: inset ? 660 : 820, rx: inset ? 0 : 20, fill: `url(#${id})` }));
}

/** Surface definitions belong to the same SVG, so detached SVG/PNG stays self-contained. */
export function appendPlayerPiece(group, create, surfaceId, team, radius = 24, strokeWidth = 3) {
  group.append(
    create('ellipse', { cy: radius * .39, rx: radius * 1.08, ry: radius * .53, fill: '#27485E', opacity: .24, filter: `url(#${surfaceId}-piece-shadow)` }),
    create('circle', { cy: radius * .16, r: radius, fill: team === 'attack' ? '#B64B20' : '#2B5D82' }),
    create('circle', { r: radius, fill: `url(#${surfaceId}-${team}-face)`, stroke: COURT_COLORS.line, 'stroke-width': strokeWidth }),
  );
}
