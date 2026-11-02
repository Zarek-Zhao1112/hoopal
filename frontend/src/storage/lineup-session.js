import { createLineup, validateLineup, MAX_LINEUPS } from '../../../shared/lineups.js';
import { createRolePlan, getRolePlanState, setRoleResponse, swapRoleMembers } from '../../../shared/tactic-roles.js';
import { isBodyTypeForMode } from '../../../shared/tactic-body-types.js';

const copy = value => JSON.parse(JSON.stringify(value));
const plansFor = (state, id) => Object.hasOwn(state.rolePlans, id) ? state.rolePlans[id] : {};
const planFor = (state, id, templateId) => Object.hasOwn(plansFor(state, id), templateId) ? plansFor(state, id)[templateId] : undefined;

/** Serializes intentions across both stores, capturing identity before queuing. */
export function createLineupSession({ repository, builtinRepository, templates, initialState, writeLocked = false }) {
  let state = copy(initialState), locked = writeLocked, queue = Promise.resolve();
  const run = operation => { const result = queue.then(operation); queue = result.catch(() => {}); return result; };
  async function commit(next) { state = await repository.save(next); locked = false; return copy(state); }
  async function clear() { if (state.playbackContext || locked) await commit({ ...state, playbackContext: null }); return copy(state); }
  const current = () => state.profiles.find(p => p.id === state.activeProfileId);
  const identity = () => ({ id: current()?.id, revision: current()?.revision });
  function check(target, expectedRevision = target.revision) {
    const profile = current();
    if (!profile || profile.id !== target.id || profile.revision !== expectedRevision) throw new Error('球队或分工已更新，请重新打开后再确认');
    return profile;
  }
  function templateFor(id, profile) {
    const template = templates.find(t => t.id === id && t.mode === profile.mode);
    if (!template) throw new Error('请选择与球队人数相同的内置战术');
    return template;
  }
  function changePlan(payload, operation) {
    const snapshot = copy(payload), target = identity();
    return run(async () => {
      const profile = check(target, snapshot.expectedRevision);
      const template = templateFor(snapshot.templateId, profile);
      const previous = planFor(state, profile.id, template.id);
      const nextPlan = operation(previous ?? createRolePlan(template, profile), template, profile, snapshot);
      const nextProfile = { ...profile, revision: profile.revision + 1 };
      await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? nextProfile : p),
        rolePlans: { ...state.rolePlans, [profile.id]: { ...plansFor(state, profile.id), [template.id]: nextPlan } }, playbackContext: null });
      return copy(nextPlan);
    });
  }
  return {
    get state() { return copy(state); },
    get writeLocked() { return locked; },
    create(options) {
      const snapshot = copy(options);
      return run(async () => {
        if (state.profiles.length >= MAX_LINEUPS) throw new Error(`最多保存 ${MAX_LINEUPS} 个阵容，请先删除不再使用的档案`);
        const base = createLineup(snapshot.mode, snapshot);
        const profile = Object.hasOwn(snapshot, 'players') ? validateLineup({ ...base, players: snapshot.players }) : base;
        if (state.profiles.some(previous => previous.id === profile.id)) throw new Error('阵容标识已存在，请勿重复创建');
        await commit({ ...state, profiles: [...state.profiles, profile], activeProfileId: profile.id, playbackContext: null });
        return copy(profile);
      });
    },
    select(id) { return run(async () => { if (!state.profiles.some(p => p.id === id)) throw new Error('阵容不存在'); return commit({ ...state, activeProfileId: id, playbackContext: null }); }); },
    update(value) {
      const snapshot = copy(value);
      return run(async () => {
        const previous = state.profiles.find(p => p.id === snapshot.id);
        if (!previous || snapshot.mode !== previous.mode) throw new Error('阵容人数不可改变，请另建档案');
        if (snapshot.revision !== previous.revision) throw new Error('档案已更新，请重新打开后再修改');
        const profile = validateLineup({ ...snapshot, bodyType: previous.bodyType, revision: previous.revision + 1, recentTemplateId: previous.recentTemplateId });
        const teamPlans = {};
        for (const [id, plan] of Object.entries(plansFor(state, profile.id))) teamPlans[id] = { ...plan, assignments: plan.assignments.map(row => row.memberId && !profile.players.some(p => p.id === row.memberId) ? { ...row, status: 'unknown', memberId: null } : row) };
        let ctx = state.playbackContext;
        if (ctx?.profileId === profile.id) {
          const template = templates.find(t => t.id === ctx.templateId);
          ctx = template && getRolePlanState(teamPlans[template.id], template, profile).ready ? { ...ctx, profileRevision: profile.revision } : null;
        }
        await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? profile : p), rolePlans: { ...state.rolePlans, [profile.id]: teamPlans }, playbackContext: ctx });
        return copy(profile);
      });
    },
    remove(id) {
      return run(async () => {
        if (!state.profiles.some(p => p.id === id)) throw new Error('阵容不存在');
        const profiles = state.profiles.filter(p => p.id !== id), rolePlans = { ...state.rolePlans }; delete rolePlans[id];
        return commit({ ...state, profiles, rolePlans, activeProfileId: state.activeProfileId === id ? profiles[0]?.id || null : state.activeProfileId, playbackContext: null });
      });
    },
    setBodyType(payload) {
      const snapshot = copy(payload), target = identity();
      return run(async () => {
        if (locked) throw new Error('阵容读取未成功，请先重试读取，原档案未被覆盖');
        if (!snapshot || snapshot.profileId !== target.id || !Number.isSafeInteger(snapshot.expectedRevision)) throw new Error('球队或版本无效，请重新选择');
        const profile = check(target, snapshot.expectedRevision);
        if (!isBodyTypeForMode(profile.mode, snapshot.bodyType)) throw new Error('请选择该人数的有效体型分类');
        if (profile.bodyType === snapshot.bodyType) return copy(profile);
        const nextProfile = { ...profile, bodyType: snapshot.bodyType, revision: profile.revision + 1 };
        await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? nextProfile : p), playbackContext: null });
        return copy(nextProfile);
      });
    },
    confirmRole: payload => changePlan(payload, (plan, template, profile, p) => setRoleResponse(plan, p.roleId, { status: p.status, memberId: p.memberId }, template, profile)),
    swapRoles: payload => changePlan(payload, (plan, template, profile, p) => swapRoleMembers(plan, p.roleA, p.roleB, template, profile)),
    resetRolePlan: payload => changePlan(payload, (_plan, template, profile) => createRolePlan(template, profile)),
    clearContext: () => run(clear),
    play(templateId) {
      const target = identity();
      return run(async () => {
        const profile = check(target), template = templateFor(templateId, profile);
        const plan = planFor(state, profile.id, templateId);
        const result = getRolePlanState(plan, template, profile);
        if (!result.ready) throw new Error('请先确认全部职责和队员，再用本队演练');
        await clear();
        await builtinRepository.saveSelection({ templateId, frameIndex: 0 });
        const nextProfile = { ...profile, recentTemplateId: templateId };
        await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? nextProfile : p), playbackContext: { source: 'role-confirmations', profileId: profile.id, profileRevision: profile.revision, templateId, roleVersion: template.roleVersion } });
        return { templateId, plan: copy(plan) };
      });
    },
    reload() { return run(async () => { const result = await repository.load(); state = result.state; locked = result.writeLocked; return result; }); },
    async flush() { await queue; await repository.flush(); },
  };
}
