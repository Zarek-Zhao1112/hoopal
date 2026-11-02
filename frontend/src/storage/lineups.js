import { validateLineup, validateLegacyLineup, MAX_LINEUPS } from '../../../shared/lineups.js';
import { validateRolePlan, getRolePlanState } from '../../../shared/tactic-roles.js';

export const LINEUPS_KEY = 'halfcourt-lineups-v1';
export const emptyLineupState = () => ({ schemaVersion: 2, profiles: [], activeProfileId: null, rolePlans: {}, playbackContext: null });
const copy = value => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const own = (value, key) => object(value) && Object.hasOwn(value, key) ? value[key] : undefined;

/** v1 bytes are backed up before the first v2 write. Reads never migrate on disk. */
export function createLineupRepository({ adapter, templates, makeBackupId = uid } = {}) {
  if (!adapter?.getItem || !adapter?.setItem) throw new TypeError('须提供阵容存储适配器');
  const catalog = new Map(templates.map(t => [t.id, t]));
  let loaded = false, locked = false, backupRaw = null, backupKind = null, backupDone = false;
  let queue = Promise.resolve(), lastWrite = Promise.resolve();
  function enqueue(operation) { const result = queue.then(operation); queue = result.catch(() => {}); return result; }
  const sameMode = (id, mode) => catalog.get(id)?.mode === mode;
  function historicalPlan(plan, template, profile) {
    if (!object(plan) || plan.templateId !== template.id || !Number.isSafeInteger(plan.roleVersion) || plan.roleVersion < 1 || !Array.isArray(plan.assignments) || plan.assignments.length !== profile.players.length) throw new Error('旧分工格式无效');
    const roles = new Set(), members = new Set();
    const assignments = plan.assignments.map(row => {
      if (!object(row) || typeof row.roleId !== 'string' || !row.roleId || row.roleId.length > 100 || roles.has(row.roleId) || !['unknown', 'available', 'missing'].includes(row.status)) throw new Error('旧分工职责无效');
      roles.add(row.roleId);
      if (row.status === 'available') {
        if (!profile.players.some(p => p.id === row.memberId) || members.has(row.memberId)) throw new Error('旧分工成员无效');
        members.add(row.memberId);
      } else if (row.memberId !== null) throw new Error('未确认职责不能绑定队员');
      return { roleId: row.roleId, status: row.status, memberId: row.memberId };
    });
    return { templateId: plan.templateId, roleVersion: plan.roleVersion, assignments };
  }
  function decode(value, tolerant = false) {
    if (!object(value) || ![1, 2].includes(value.schemaVersion) || !Array.isArray(value.profiles) || value.schemaVersion === 2 && !object(value.rolePlans)) throw new Error('阵容档案格式或版本无法读取');
    const legacy = value.schemaVersion === 1, state = emptyLineupState(), warnings = [];
    let staleRoles = false;
    for (const raw of value.profiles) {
      try {
        const profile = validateLineup(legacy ? validateLegacyLineup(raw) : raw);
        if (state.profiles.length >= MAX_LINEUPS) throw new Error('超过档案容量');
        if (state.profiles.some(p => p.id === profile.id)) throw new Error('档案标识重复');
        if (profile.recentTemplateId && !sameMode(profile.recentTemplateId, profile.mode)) {
          if (!tolerant) throw new Error('档案战术须为同人数内置战术');
          profile.recentTemplateId = null; warnings.push('某个阵容的旧战术引用已失效，已解除引用');
        }
        state.profiles.push(profile);
      } catch (error) { if (!tolerant) throw error; warnings.push(`一份无效阵容已隔离，原文将在替换前备份：${error.message}`); }
    }
    state.activeProfileId = state.profiles.some(p => p.id === value.activeProfileId) ? value.activeProfileId : null;
    if (!legacy) for (const [profileId, plans] of Object.entries(value.rolePlans)) {
      const profile = state.profiles.find(p => p.id === profileId);
      try {
        if (!profile || !object(plans)) throw new Error('分工所属球队无效');
        const valid = {};
        for (const [templateId, plan] of Object.entries(plans)) {
          try {
            const template = catalog.get(templateId);
            if (!template || !sameMode(templateId, profile.mode)) throw new Error('分工战术无效');
            const normalized = plan?.roleVersion === template.roleVersion ? validateRolePlan(plan, template, profile) : historicalPlan(plan, template, profile);
            if (plan.roleVersion !== template.roleVersion) staleRoles = true;
            Object.defineProperty(valid, templateId, { value: normalized, enumerable: true, configurable: true, writable: true });
          } catch (error) { if (!tolerant) throw error; warnings.push(`一份无效战术分工已隔离，原文将在替换前备份：${error.message}`); }
        }
        Object.defineProperty(state.rolePlans, profileId, { value: valid, enumerable: true, configurable: true, writable: true });
      } catch (error) { if (!tolerant) throw error; warnings.push(`无效分工集合已隔离，原文将在替换前备份：${error.message}`); }
    }
    const ctx = value.playbackContext;
    const profile = state.profiles.find(p => p.id === ctx?.profileId && p.id === state.activeProfileId);
    const template = catalog.get(ctx?.templateId);
    if (!legacy && profile && template && template.mode === profile.mode && ctx.source === 'role-confirmations' && ctx.profileRevision === profile.revision && ctx.roleVersion === template.roleVersion && getRolePlanState(own(own(state.rolePlans, profile.id), template.id), template, profile).ready) {
      state.playbackContext = { source: 'role-confirmations', profileId: profile.id, profileRevision: profile.revision, templateId: template.id, roleVersion: template.roleVersion };
    }
    return { state, warnings, staleRoles };
  }
  return {
    load() {
      return enqueue(async () => {
        loaded = false; locked = false; backupRaw = null; backupKind = null; backupDone = false;
        const warnings = []; let state = emptyLineupState();
        try {
          const raw = await adapter.getItem(LINEUPS_KEY);
          if (raw !== null) {
            let decoded;
            try { decoded = JSON.parse(raw); } catch { backupRaw = raw; backupKind = 'corrupt'; warnings.push('阵容文件损坏，原文将保留并在保存前备份'); }
            if (decoded !== undefined) {
              if (!object(decoded) || ![1, 2].includes(decoded.schemaVersion) || !Array.isArray(decoded.profiles) || decoded.schemaVersion === 2 && !object(decoded.rolePlans)) {
                locked = true; warnings.push('阵容档案版本或格式无法读取，已保护原文件；请重试或使用兼容版本');
              } else {
                const result = decode(decoded, true); state = result.state; warnings.push(...result.warnings);
                if (decoded.schemaVersion === 1) { backupRaw = raw; backupKind = 'migration-v1'; warnings.push('球队资料已读取；旧自动分工已解除，请按战术重新确认职责'); }
                else if (result.warnings.length || result.staleRoles) { backupRaw = raw; backupKind = result.warnings.length ? 'corrupt' : 'role-version'; }
              }
            }
          }
          loaded = true;
        } catch (error) { locked = true; warnings.push(`阵容读取失败，未覆盖原文件，请重试：${error.message}`); }
        return { state: copy(state), warnings, writeLocked: locked };
      });
    },
    save(value) {
      let snapshot;
      try { if (value?.schemaVersion !== 2) throw new Error('保存须使用新版球队格式'); snapshot = JSON.stringify(decode(value).state); }
      catch (error) { lastWrite = Promise.reject(error); lastWrite.catch(() => {}); return lastWrite; }
      const result = enqueue(async () => {
        if (!loaded || locked) throw new Error('阵容读取未成功，请先重试读取，原档案未被覆盖');
        if (backupRaw !== null && !backupDone) { await adapter.setItem(`${LINEUPS_KEY}.${backupKind}-${makeBackupId()}`, backupRaw); backupDone = true; }
        await adapter.setItem(LINEUPS_KEY, snapshot);
        backupRaw = null; backupKind = null; backupDone = false;
        return JSON.parse(snapshot);
      });
      lastWrite = result; return result;
    },
    flush() { const pending = queue, latest = lastWrite; return pending.then(() => latest); },
  };
}
