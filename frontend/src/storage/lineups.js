import { validateLineup, MAX_LINEUPS } from '../../../shared/lineups.js';

export const LINEUPS_KEY = 'halfcourt-lineups-v1';
export const emptyLineupState = () => ({ schemaVersion: 1, profiles: [], activeProfileId: null, playbackContext: null });
const copy = value => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** A separate store: the retired personal Play keys must never include lineups. */
export function createLineupRepository({ adapter, templates, makeBackupId = uid } = {}) {
  if (!adapter?.getItem || !adapter?.setItem) throw new TypeError('须提供阵容存储适配器');
  const catalog = new Map(templates.map(t => [t.id, t]));
  let loaded = false, locked = false, damagedRaw = null, backupDone = false;
  let queue = Promise.resolve(), lastWrite = Promise.resolve();
  function enqueue(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }
  function offense(id, mode) {
    const template = catalog.get(id);
    return template && (template.kind || 'offense') === 'offense' && template.mode === mode;
  }
  function decode(value, tolerant = false) {
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.profiles)) throw new Error('阵容档案格式或版本无法读取');
    const state = emptyLineupState(), warnings = [];
    for (const raw of value.profiles) {
      try {
        const profile = validateLineup(raw);
        if (state.profiles.length >= MAX_LINEUPS) throw new Error('超过档案容量');
        if (state.profiles.some(p => p.id === profile.id)) throw new Error('档案标识重复');
        if (profile.recentTemplateId && !offense(profile.recentTemplateId, profile.mode)) {
          if (!tolerant) throw new Error('档案战术须为同人数内置进攻');
          profile.recentTemplateId = null;
          warnings.push('某个阵容的旧战术引用已失效，已解除引用');
        }
        state.profiles.push(profile);
      } catch (error) {
        if (!tolerant) throw error;
        warnings.push(`一份无效阵容已隔离，原文将在替换前备份：${error.message}`);
      }
    }
    state.activeProfileId = state.profiles.some(p => p.id === value.activeProfileId) ? value.activeProfileId : null;
    const ctx = value.playbackContext;
    const profile = state.profiles.find(p => p.id === ctx?.profileId);
    // A stale/partial write fails closed: never attach old names just because
    // the selected template happens to have the same ID.
    if (profile && profile.id === state.activeProfileId && ctx.profileRevision === profile.revision && offense(ctx.templateId, profile.mode)) {
      state.playbackContext = { profileId: profile.id, profileRevision: profile.revision, templateId: ctx.templateId };
    }
    return { state, warnings };
  }
  return {
    load() {
      return enqueue(async () => {
        loaded = false; locked = false; damagedRaw = null; backupDone = false;
        const warnings = [];
        let state = emptyLineupState();
        try {
          const raw = await adapter.getItem(LINEUPS_KEY);
          if (raw !== null) {
            let decoded;
            try { decoded = JSON.parse(raw); }
            catch { damagedRaw = raw; warnings.push('阵容文件损坏，原文将保留并在保存前备份'); }
            if (decoded !== undefined) {
              // Unknown future schemas are not corruption to overwrite.
              if (decoded?.schemaVersion !== 1 || !Array.isArray(decoded?.profiles)) {
                locked = true;
                warnings.push('阵容档案版本或格式无法读取，已保护原文件；请重试或使用兼容版本');
              } else {
                const result = decode(decoded, true);
                state = result.state; warnings.push(...result.warnings);
                if (result.warnings.length) damagedRaw = raw;
              }
            }
          }
          loaded = true;
        } catch (error) {
          locked = true;
          warnings.push(`阵容读取失败，未覆盖原文件，请重试：${error.message}`);
        }
        return { state: copy(state), warnings, writeLocked: locked };
      });
    },
    save(value) {
      let snapshot;
      try { snapshot = JSON.stringify(decode(value).state); }
      catch (error) {
        lastWrite = Promise.reject(error); lastWrite.catch(() => {});
        return lastWrite;
      }
      const result = enqueue(async () => {
        if (!loaded || locked) throw new Error('阵容读取未成功，请先重试读取，原档案未被覆盖');
        if (damagedRaw !== null && !backupDone) {
          await adapter.setItem(`${LINEUPS_KEY}.corrupt-${makeBackupId()}`, damagedRaw);
          backupDone = true;
        }
        await adapter.setItem(LINEUPS_KEY, snapshot);
        damagedRaw = null; backupDone = false;
        return JSON.parse(snapshot);
      });
      lastWrite = result;
      return result;
    },
    flush() { const pending = queue, latest = lastWrite; return pending.then(() => latest); },
  };
}
