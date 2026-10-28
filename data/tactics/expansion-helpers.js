import {defineTactic} from './helpers.js';
export {defenseRun as defend} from './defense-helpers.js';

export const frame = (note, attack, defense, paths = [], holder) => ({
  note, holder, paths,
  positions: Object.fromEntries([
    ...attack.map((xy, i) => [`attack-${i + 1}`, xy]),
    ...defense.map((xy, i) => [`defense-${i + 1}`, xy]),
  ]),
});
// Reference defenders also have explicit outgoing routes when repositioning.
export const defineExpansion = metadata => defineTactic({ ...metadata, steps: metadata.steps.map((step, index) => {
  const next = metadata.steps[index + 1];
  const paths = [...step.paths];
  if (next) for (const [playerId, start] of Object.entries(step.positions)) {
    const end = next.positions[playerId];
    if (playerId.startsWith('defense-') && !paths.some(path => path.playerId === playerId && ['run', 'dribble'].includes(path.type)) && Math.hypot(end[0] - start[0], end[1] - start[1]) > .001) {
      paths.push({ type: 'run', playerId, points: [start, end].map(([x, y]) => ({ x, y })) });
    }
  }
  return { ...step, paths };
}) });
