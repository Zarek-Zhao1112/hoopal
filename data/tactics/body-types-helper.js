// Every tactic explicitly authors its own browsing memberships and copy.
// No positions, roles or skills are inferred from the team's body type.
export function withBodyTypes(definition, notes) {
  return { ...definition, bodyTypes: Object.keys(notes), bodyTypeNotes: { ...notes } };
}
