const roleOptions = {
  start: ['持球发起', '持球、突破分球'],
  support: ['掩护策应', '做掩护、接应'],
  screen: ['掩护配合', '做掩护、顺下或外弹'],
  relay: ['接球策应', '接球、回传或转移'],
  space: ['空间终结', '拉开、空切或接投'],
  '': ['暂不设置', '以后再选'],
};
const rolesByMode = {
  '3v3': ['start', 'support', 'space'],
  '4v4': ['start', 'screen', 'relay', 'space'],
};

// Position preferences are indexed by attack marker number, not by the order
// in which role definitions are stored. The build gate checks every offense.
const preferences = {
  'pick-roll': ['start', 'support', 'space'],
  'give-go': ['space', 'start', 'support'],
  'back-screen': ['start', 'space', 'support'],
  'dribble-handoff': ['support', 'start', 'space'],
  'pick-pop': ['start', 'support', 'space'],
  'baseline-backdoor': ['start', 'space', 'support'],
  'post-split': ['start', 'space', 'support'],
  'slip-screen': ['start', 'support', 'space'],
  'offball-flare': ['start', 'space', 'support'],
  'four-out-cut': ['space', 'relay', 'start', 'space'],
  'four-spread-pick-roll': ['start', 'space', 'space', 'screen'],
  'staggered-screens': ['start', 'space', 'screen', 'screen'],
  'high-low': ['start', 'relay', 'space', 'relay'],
  'drive-corner-kick': ['relay', 'space', 'start', 'space'],
  'spain-pick-roll': ['start', 'screen', 'space', 'screen'],
  'hammer': ['start', 'space', 'screen', 'space'],
  'zoom-handoff': ['screen', 'start', 'screen', 'space'],
  'screen-the-screener': ['start', 'screen', 'space', 'screen'],
};

export function getTeamRoleOptions(mode) {
  if (!Object.hasOwn(rolesByMode, mode)) throw new Error('请选择3v3或4v4人数');
  return [...rolesByMode[mode], ''].map(id => {
    const [label, description] = roleOptions[id];
    return { id, label, description };
  });
}

export function isMainRoleForMode(mode, role) {
  return typeof role === 'string' && Object.hasOwn(rolesByMode, mode) && rolesByMode[mode].includes(role);
}

function tacticSlots(template) {
  const preferred = Object.hasOwn(preferences, template.id) ? preferences[template.id] : null;
  const count = template.mode === '3v3' ? 3 : template.mode === '4v4' ? 4 : 0;
  if (!count || preferred?.length !== count || preferred.some(role => !isMainRoleForMode(template.mode, role))) {
    throw new Error(`${template.id}：缺少完整或合法的通用角色偏好`);
  }
  if (!Array.isArray(template.roles) || template.roles.length !== count) {
    throw new Error(`${template.id}：通用角色缺少对应的战术位置`);
  }
  return preferred.map((preferredRole, index) => {
    const playerId = `attack-${index + 1}`;
    const role = template.roles.find(candidate => candidate.playerId === playerId);
    if (!role) throw new Error(`${template.id}：通用角色缺少对应棋子 ${playerId}`);
    return { playerId, title: role.title, task: role.task, preferredRole };
  });
}

export function validateTeamRolePreferences(templates) {
  const offense = templates.filter(template => template.kind === 'offense');
  offense.forEach(tacticSlots);
  const ids = new Set(offense.map(template => template.id));
  for (const id of Object.keys(preferences)) {
    if (!ids.has(id)) throw new Error(`${id}：通用角色偏好未对应进攻战术`);
  }
}

/** Assign each member once, maximizing role matches and breaking ties by roster order. */
export function assignTeamRoles(template, profile) {
  if (template?.kind !== 'offense' || profile?.mode !== template.mode || !Array.isArray(profile?.players)) return null;
  const players = profile.players;
  if (!players.some(player => isMainRoleForMode(profile.mode, player?.mainRole))) return null;
  const slots = tacticSlots(template);
  const ids = players.map(player => player?.id);
  if (players.length !== slots.length || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return null;

  let best, bestScore = -1;
  function visit(order, remaining, score) {
    if (!remaining.length) {
      if (score > bestScore) { best = order; bestScore = score; }
      return;
    }
    for (const player of remaining) {
      const match = player.mainRole === slots[order.length].preferredRole;
      visit([...order, player], remaining.filter(other => other !== player), score + Number(match));
    }
  }
  visit([], players, 0);
  return slots.map(({ playerId, title, task }, index) => {
    const { id: memberId, number, name } = best[index];
    return { playerId, memberId, number, name, title, task };
  });
}
