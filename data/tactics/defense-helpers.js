import { pass } from './helpers.js';

/** Defense actors have their own helper; existing attacking helpers are unchanged. */
export const defenseRun = (number, ...points) => ({
  type: 'run', playerId: `defense-${number}`, points: points.map(([x, y]) => ({ x, y }))
});

/**
 * Independent reference snapshots, with no attacking-template binding.
 * Full team positions make assignments visible; each blue move gets its own
 * outgoing route. Optional via[number] supplies intermediate defensive footwork.
 */
export function defineDefenseTactic({ steps, ...metadata }) {
  return {
    difficulty: '基础', ...metadata, kind: 'defense',
    steps: steps.map((step, index) => {
      const next = steps[index + 1];
      const positions = {};
      for (const [team, coordinates] of [['attack', step.attack], ['defense', step.defense]]) coordinates.forEach(([x, y], number) => { positions[`${team}-${number + 1}`] = [x, y]; });
      const paths = [];
      if (next) {
        step.defense.forEach((start, number) => {
          const end = next.defense[number];
          if (Math.hypot(end[0] - start[0], end[1] - start[1]) > 0.001) paths.push(defenseRun(number + 1, start, ...(step.via?.[number + 1] ?? []), end));
        });
        if (step.holder !== next.holder) paths.push(pass(step.holder, step.attack[step.holder - 1], next.attack[next.holder - 1]));
      }
      return { note: step.note, positions, holder: `attack-${step.holder}`, paths };
    })
  };
}
