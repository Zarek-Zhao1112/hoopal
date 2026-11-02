// Each tactic authors its complete duties next to its animation. Array order here
// is an authoring convenience; saved bindings use the stable role/player IDs.
export function defineRoles(kind, rows) {
  const side = kind === 'defense' ? 'defense' : 'attack';
  return {
    roleVersion: 1,
    roles: rows.map(([title, task, actionIds], index) => ({
      id: `${side}-${index + 1}`, playerId: `${side}-${index + 1}`,
      number: index + 1, title, task, actionIds
    }))
  };
}
