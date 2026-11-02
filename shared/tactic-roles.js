// Pure tactical requirements. These are actions to confirm for one play, not
// permanent ability ratings or a claim that a team will succeed in a match.
export const ROLE_ACTIONS = Object.freeze({
  'use-ball-screen': '等掩护站稳后持球借挡推进',
  'drive-pass': '突破时保护球权，观察协防并分球',
  'stationary-screen': '提前到位，站稳合法掩护后再移动',
  'roll-finish': '掩护释放后顺下，接球近筐终结或回传',
  'space-outlet': '保持传球空间，随球移动提供安全出口',
  'catch-shoot': '空位接球后能判断并尝试投射',
  'pass-cut': '传球后观察时机，及时切入篮下',
  'cut-finish': '切入后接稳传球，在近筐判断终结或回传',
  'read-cut-pass': '观察队友跑位窗口，及时送出可接的传球',
  'use-offball-screen': '等无球掩护站稳后，按路线借挡跑出',
  'fill-perimeter': '队友切入时补上外线空位',
  'handoff-give': '控制交球距离，近身完成手递手',
  'handoff-receive': '跑近持球人，接稳递手后继续推进',
  'backdoor-cut': '先做接球假动作，再沿底线反跑切入',
  'perimeter-transfer': '观察接应位置，完成外线转移球',
  'post-entry-pass': '观察接球与防守位置，向高低位送入口传球',
  'post-seal': '低位先站位保护接球空间，再判断反跑',
  'post-protect': '高低位接球后保护球权，抬头观察队友',
  'high-low-pass': '高位观察低位要位或反跑，送出内传',
  'slip-before-contact': '识别提前拆出时机，未形成掩护接触便切入',
  'cross-baseline-pass': '沿底线推进时观察弱侧，传向对侧底角',
  'contain-ball': '出防后用脚步保持在球与篮筐之间',
  'help-recover': '随球收缩帮助，并及时恢复到负责位置',
  'closeout': '向新接球人出防，控制速度并准备侧向防守',
  'protect-rim': '提前收缩保护篮下，兼顾身后接应',
  'zone-handoff': '按球所在区域交流交接，不追着球漏掉区域',
  'trap-timing': '等球进入指定边线或底角后再合围',
  'trap-spacing': '与队友从两侧控制夹击间隙，保持合法防守',
  'outlet-coverage': '优先照看指定传球出口，兼顾其他威胁',
  'rotation-exchange': '协防后先补空位，通过交流接管新对位',
  'stop-drive': '提前到突破线路，合法站位阻挡推进'
});

const statuses = new Set(['unknown', 'available', 'missing']);
const text = value => typeof value === 'string' && value.trim().length > 0;
const countFor = mode => mode === '3v3' ? 3 : mode === '4v4' ? 4 : 0;
const fail = message => { throw new Error(message); };

export function validateTacticRoles(template) {
  if (!template || !text(template.id) || !countFor(template.mode) || !['offense', 'defense'].includes(template.kind)) fail('战术角色：战术身份或人数无效');
  if (!Number.isSafeInteger(template.roleVersion) || template.roleVersion < 1) fail(`${template.id}：缺少有效角色版本`);
  const count = countFor(template.mode);
  if (!Array.isArray(template.roles) || template.roles.length !== count) fail(`${template.id}：必须定义全部${count}位职责`);
  const side = template.kind === 'defense' ? 'defense' : 'attack';
  const expected = new Set(Array.from({ length: count }, (_, i) => `${side}-${i + 1}`));
  const ids = new Set(), actors = new Set();
  const roles = template.roles.map(role => {
    if (!role || !text(role.id) || ids.has(role.id)) fail(`${template.id}：角色ID无效或重复`);
    if (!expected.has(role.playerId) || actors.has(role.playerId)) fail(`${template.id}：角色棋子缺失、重复或阵营错误`);
    if (role.number !== Number(role.playerId.split('-')[1])) fail(`${template.id}：职责号与棋子不一致`);
    if (!text(role.title) || !text(role.task)) fail(`${template.id}：角色名称和整套职责不能为空`);
    if (!Array.isArray(role.actionIds) || !role.actionIds.length || new Set(role.actionIds).size !== role.actionIds.length || role.actionIds.some(id => !Object.hasOwn(ROLE_ACTIONS, id))) fail(`${template.id}：角色动作条件无效`);
    ids.add(role.id); actors.add(role.playerId);
    return { ...role, actionIds: [...role.actionIds] };
  });
  if (typeof template.build !== 'function') fail(`${template.id}：缺少动画构建接口`);
  const play = template.build();
  if (play.mode !== template.mode) fail(`${template.id}：动画人数与战术不一致`);
  const frames = play.frames;
  if (!Array.isArray(frames) || !frames.length) fail(`${template.id}：动画帧为空`);
  for (const frame of frames) {
    if (!Array.isArray(frame.players)) fail(`${template.id}：动画棋子无效`);
    const friendly = frame.players.filter(player => player?.team === side);
    if (friendly.length !== count || new Set(friendly.map(player => player.id)).size !== count || friendly.some(player => !expected.has(player.id))) fail(`${template.id}：动画各帧的本队棋子不一致`);
    for (const role of roles) if (!friendly.some(player => player.id === role.playerId && player.number === role.number)) fail(`${template.id}：职责引用悬空棋子或编号不一致`);
  }
  for (const role of roles) if (role.stepHints !== undefined) {
    if (!Array.isArray(role.stepHints) || role.stepHints.some(hint => !hint || !Number.isInteger(hint.stepIndex) || hint.stepIndex < 0 || hint.stepIndex >= frames.length || !text(hint.note))) fail(`${template.id}：角色阶段提示无效`);
  }
  return roles;
}

export function validateTacticCatalog(templates) {
  if (!Array.isArray(templates) || !templates.length) fail('战术目录为空');
  const ids = new Set();
  for (const template of templates) {
    if (ids.has(template.id)) fail(`战术ID重复：${template.id}`);
    validateTacticRoles(template); ids.add(template.id);
  }
  return templates;
}

function validateTeam(profile, template) {
  if (!profile || profile.mode !== template.mode || !Array.isArray(profile.players) || profile.players.length !== countFor(template.mode)) fail('请先选择相同人数的球队');
  const memberIds = profile.players.map(player => player?.id);
  if (memberIds.some(id => !text(id)) || new Set(memberIds).size !== memberIds.length) fail('球队成员身份无效');
  return new Set(memberIds);
}

export function createRolePlan(template, profile) {
  const roles = validateTacticRoles(template);
  if (profile) validateTeam(profile, template);
  return { templateId: template.id, roleVersion: template.roleVersion,
    assignments: roles.map(role => ({ roleId: role.id, status: 'unknown', memberId: null })) };
}

export function validateRolePlan(plan, template, profile) {
  const roles = validateTacticRoles(template);
  const members = validateTeam(profile, template);
  if (!plan || plan.templateId !== template.id || plan.roleVersion !== template.roleVersion) fail('战术职责已更新，请重新确认');
  if (!Array.isArray(plan.assignments) || plan.assignments.length !== roles.length) fail('战术分工不完整');
  const byId = new Map(), assigned = new Set();
  for (const assignment of plan.assignments) {
    if (!assignment || !roles.some(role => role.id === assignment.roleId) || byId.has(assignment.roleId) || !statuses.has(assignment.status)) fail('战术分工角色或状态无效');
    if (assignment.status === 'available') {
      if (!members.has(assignment.memberId) || assigned.has(assignment.memberId)) fail('请为每位职责选择不同的现有队员');
      assigned.add(assignment.memberId);
    } else if (assignment.memberId !== null) fail('未确认或暂缺的职责不能绑定队员');
    byId.set(assignment.roleId, { roleId: assignment.roleId, status: assignment.status, memberId: assignment.memberId });
  }
  return { templateId: template.id, roleVersion: template.roleVersion,
    assignments: roles.map(role => byId.get(role.id)) };
}

export function getRolePlanState(plan, template, profile) {
  const roles = validateTacticRoles(template);
  let validated = null, reason = null;
  if (!profile) reason = 'team-required';
  else if (profile.mode !== template.mode) reason = 'mode-mismatch';
  else if (plan) {
    try { validated = validateRolePlan(plan, template, profile); }
    catch { reason = plan.roleVersion !== template.roleVersion ? 'role-version' : 'invalid-plan'; }
  } else {
    try { validateTeam(profile, template); } catch { reason = 'invalid-team'; }
  }
  const rows = roles.map(role => {
    const assignment = validated?.assignments.find(item => item.roleId === role.id);
    return { ...role, status: assignment?.status ?? 'unknown', memberId: assignment?.memberId ?? null };
  });
  const confirmedCount = rows.filter(role => role.status === 'available').length;
  return { ready: !reason && confirmedCount === roles.length,
    confirmedCount, needsReview: Boolean(plan && reason), reason, roles: rows };
}

export function setRoleResponse(plan, roleId, response, template, profile) {
  const current = plan ? validateRolePlan(plan, template, profile) : createRolePlan(template, profile);
  validateTeam(profile, template);
  if (!current.assignments.some(role => role.roleId === roleId) || !response || !statuses.has(response.status)) fail('职责或确认状态无效');
  const memberId = response.status === 'available' ? response.memberId : null;
  return validateRolePlan({ ...current, assignments: current.assignments.map(role => role.roleId === roleId ? { roleId, status: response.status, memberId } : role) }, template, profile);
}

export function swapRoleMembers(plan, roleA, roleB, template, profile) {
  const current = validateRolePlan(plan, template, profile);
  const a = current.assignments.find(role => role.roleId === roleA), b = current.assignments.find(role => role.roleId === roleB);
  if (!a || !b || roleA === roleB || a.status !== 'available' || b.status !== 'available') fail('请选择两个已确认的职责进行交换');
  return validateRolePlan({ ...current, assignments: current.assignments.map(role => role.roleId === roleA ? { ...role, memberId: b.memberId } : role.roleId === roleB ? { ...role, memberId: a.memberId } : role) }, template, profile);
}

export function suggestRoleAlternatives(template, roleId, templates) {
  const role = validateTacticRoles(template).find(item => item.id === roleId);
  if (!role) fail('缺少要比较的职责');
  const actions = new Set(role.actionIds);
  return templates.filter(candidate => {
    if (candidate.id === template.id || candidate.mode !== template.mode || candidate.kind !== template.kind) return false;
    const roles = validateTacticRoles(candidate);
    return !roles.some(item => item.actionIds.some(action => actions.has(action)));
  });
}
