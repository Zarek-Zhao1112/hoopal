// Pure data helpers. Coordinates refer to player centres unless noted otherwise.
export const run = (number, ...points) => route('run', number, points);
export const dribble = (number, ...points) => route('dribble', number, points);
export const screen = (number, ...points) => route('screen', number, points);
export const pass = (number, from, to) => route('pass', number, [ballAt(from), ballAt(to)]);
const ballAt = ([x, y]) => [Math.min(930, x + 24), Math.max(70, y - 16)];
const route = (type, number, points) => ({ type, playerId: `attack-${number}`, points: points.map(([x, y]) => ({ x, y })) });
export const defineTactic = definition => ({ mode: '3v3', difficulty: '基础', ...definition });
