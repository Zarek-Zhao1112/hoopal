const roleOptions = {
  start: ['持球发起', '持球、突破分球'],
  support: ['掩护策应', '做掩护、接应'],
  spacing: ['空间拉开', '保持弱侧或外线空间'],
  finisher: ['得分终结', '负责这套配合的主要得分终结'],
  screen: ['掩护配合', '做掩护、顺下或外弹'],
  relay: ['接球策应', '接球、回传或转移'],
  space: ['空间终结', '拉开、空切或接投'],
  '': ['暂不设置', '以后再选'],
};
const rolesByMode = {
  '3v3': ['start', 'support', 'spacing', 'space'],
  '4v4': ['start', 'screen', 'relay', 'spacing', 'finisher', 'space'],
};

// Position preferences are indexed by attack marker number, not by the order
// in which role definitions are stored. The build gate checks every offense.
const preferences = {
  'pick-roll': [['start'], ['support', 'space'], ['spacing']],
  'give-go': [['start', 'space'], ['support'], ['spacing']],
  'back-screen': [['start'], ['space'], ['support', 'spacing']],
  'dribble-handoff': [['support', 'space'], ['start', 'support'], ['spacing']],
  'pick-pop': [['start'], ['support', 'space'], ['spacing']],
  'baseline-backdoor': [['start'], ['space'], ['spacing', 'support']],
  'post-split': [['start', 'support'], ['space'], ['support']],
  'slip-screen': [['start'], ['space', 'support'], ['spacing']],
  'offball-flare': [['start'], ['space', 'spacing'], ['support', 'spacing']],
  // Keep legacy 4v4 `space` at exactly its historical positions. New role
  // IDs distinguish the tactic's scorer from players who hold spacing.
  'four-out-cut': [['start', 'finisher', 'space'], ['relay'], ['spacing'], ['spacing', 'space']],
  'four-spread-pick-roll': [['start'], ['spacing', 'space'], ['spacing', 'space'], ['screen', 'finisher']],
  'staggered-screens': [['start'], ['finisher', 'relay', 'space'], ['screen'], ['screen', 'finisher']],
  'high-low': [['start'], ['relay'], ['finisher', 'space'], ['relay']],
  'drive-corner-kick': [['relay'], ['spacing', 'space'], ['start'], ['finisher', 'space']],
  'spain-pick-roll': [['start'], ['screen', 'finisher'], ['spacing', 'space'], ['screen', 'finisher']],
  'hammer': [['start'], ['finisher', 'space'], ['screen'], ['spacing', 'space']],
  'zoom-handoff': [['screen'], ['start'], ['screen', 'spacing'], ['finisher', 'space']],
  'screen-the-screener': [['start'], ['screen', 'finisher'], ['finisher', 'space'], ['screen']],
};

export function getTeamRoleOptions(mode) {
  if (!Object.hasOwn(rolesByMode, mode)) throw new Error('请选择3v3或4v4人数');
  return [...rolesByMode[mode], ''].map(id => {
    const [label, description] = id === 'space' && mode === '3v3'
      ? ['得分终结', '负责这套配合的主要得分终结']
      : roleOptions[id];
    return { id, label, description };
  });
}

export function isMainRoleForMode(mode, role) {
  return typeof role === 'string' && Object.hasOwn(rolesByMode, mode) && rolesByMode[mode].includes(role);
}

function tacticSlots(template) {
  const preferred = Object.hasOwn(preferences, template.id) ? preferences[template.id] : null;
  const count = template.mode === '3v3' ? 3 : template.mode === '4v4' ? 4 : 0;
  if (!count || preferred?.length !== count || preferred.some(roles => {
    const accepted = Array.isArray(roles) ? roles : [roles];
    return !accepted.length || accepted.some(role => !isMainRoleForMode(template.mode, role));
  })) {
    throw new Error(`${template.id}：缺少完整或合法的通用角色偏好`);
  }
  if (!Array.isArray(template.roles) || template.roles.length !== count) {
    throw new Error(`${template.id}：通用角色缺少对应的战术位置`);
  }
  return preferred.map((preferredRoles, index) => {
    const playerId = `attack-${index + 1}`;
    const role = template.roles.find(candidate => candidate.playerId === playerId);
    if (!role) throw new Error(`${template.id}：通用角色缺少对应棋子 ${playerId}`);
    return { playerId, title: role.title, task: role.task, preferredRoles: Array.isArray(preferredRoles) ? preferredRoles : [preferredRoles] };
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

/** Match primary roles first, secondary roles next, then fill by roster order. */
export function assignTeamRoles(template, profile) {
  if (template?.kind !== 'offense' || profile?.mode !== template.mode || !Array.isArray(profile?.players)) return null;
  const players = profile.players;
  if (!players.some(player => isMainRoleForMode(profile.mode, player?.mainRole) || isSecondaryRoleForMode(profile.mode, player?.secondaryRole))) return null;
  const slots = tacticSlots(template);
  const ids = players.map(player => player?.id);
  if (players.length !== slots.length || ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return null;

  let best, bestMain = -1, bestSecondary = -1;
  function visit(order, remaining, mainScore, secondaryScore) {
    if (!remaining.length) {
      if (mainScore > bestMain || mainScore === bestMain && secondaryScore > bestSecondary) {
        best = order; bestMain = mainScore; bestSecondary = secondaryScore;
      }
      return;
    }
    const slot = slots[order.length];
    for (const player of remaining) {
      const primaryMatch = slot.preferredRoles.includes(player.mainRole);
      const secondaryMatch = !primaryMatch && slot.preferredRoles.includes(player.secondaryRole);
      visit([...order, player], remaining.filter(other => other !== player), mainScore + Number(primaryMatch), secondaryScore + Number(secondaryMatch));
    }
  }
  visit([], players, 0, 0);
  return slots.map(({ playerId, title, task }, index) => {
    const { id: memberId, number, name } = best[index];
    return { playerId, memberId, number, name, title, task };
  });
}

export function isSecondaryRoleForMode(mode, role) {
  return isMainRoleForMode(mode, role);
}
