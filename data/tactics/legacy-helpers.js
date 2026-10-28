// Original four definitions keep their coordinate and ball conventions.
export function defineTemplate(id, title, description, steps, mode = '3v3') {
  return { id, title, description, steps, mode };
}

export const line = (type, playerId, points) => ({ type, playerId, points: points.map(([x, y]) => ({ x, y })) });
