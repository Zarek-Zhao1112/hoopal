import { createLineup, validateLineup, MAX_LINEUPS } from '../../../shared/lineups.js';
import { recommendLineup } from '../../../shared/recommendations.js';

const copy = value => JSON.parse(JSON.stringify(value));

/** Serializes user intentions as well as individual writes across two stores. */
export function createLineupSession({ repository, builtinRepository, templates, initialState, writeLocked = false }) {
  let state = copy(initialState), locked = writeLocked, queue = Promise.resolve();
  const run = operation => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  };
  async function commit(next) {
    state = await repository.save(next);
    locked = false;
    return copy(state);
  }
  async function clear() {
    if (state.playbackContext || locked) await commit({ ...state, playbackContext: null });
    return copy(state);
  }
  const current = () => state.profiles.find(p => p.id === state.activeProfileId);
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
        return profile;
      });
    },
    select(id) {
      return run(async () => {
        if (!state.profiles.some(p => p.id === id)) throw new Error('阵容不存在');
        return commit({ ...state, activeProfileId: id, playbackContext: null });
      });
    },
    update(value) {
      const snapshot = copy(value);
      return run(async () => {
        const previous = state.profiles.find(p => p.id === snapshot.id);
        if (!previous || snapshot.mode !== previous.mode) throw new Error('阵容人数不可改变，请另建档案');
        if (snapshot.revision !== previous.revision) throw new Error('档案已更新，请重新打开后再修改');
        const profile = validateLineup({ ...snapshot, revision: previous.revision + 1, recentTemplateId: previous.recentTemplateId });
        await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? profile : p), playbackContext: null });
        return profile;
      });
    },
    remove(id) {
      return run(async () => {
        if (!state.profiles.some(p => p.id === id)) throw new Error('阵容不存在');
        const profiles = state.profiles.filter(p => p.id !== id);
        return commit({ ...state, profiles, activeProfileId: state.activeProfileId === id ? profiles[0]?.id || null : state.activeProfileId, playbackContext: null });
      });
    },
    clearContext: () => run(clear),
    play(templateId) {
      return run(async () => {
        const profile = current();
        const result = profile && recommendLineup(profile);
        const recommendation = result?.ready && result.recommendations.find(r => r.templateId === templateId);
        const template = templates.find(t => t.id === templateId && t.mode === profile?.mode && (t.kind || 'offense') === 'offense');
        if (!recommendation || !template) throw new Error('推荐已变化，请重新选择适合当前阵容的战术');
        if (new Set(recommendation.assignments.map(a => a.role)).size !== profile.players.length || new Set(recommendation.assignments.map(a => a.playerId)).size !== profile.players.length || recommendation.assignments.some(a => !profile.players.some(p => p.id === a.playerId) || a.role < 1 || a.role > profile.players.length)) throw new Error('人员分工不完整，无法演练');
        // Invalidate old identity first. If either subsequent write fails, a
        // restart may restore plain tactics, never the previous team's names.
        await clear();
        await builtinRepository.saveSelection({ templateId, frameIndex: 0 });
        const nextProfile = { ...profile, recentTemplateId: templateId };
        await commit({ ...state, profiles: state.profiles.map(p => p.id === profile.id ? nextProfile : p), playbackContext: { profileId: profile.id, profileRevision: profile.revision, templateId } });
        return { templateId, recommendation };
      });
    },
    reload() {
      return run(async () => {
        const result = await repository.load();
        state = result.state; locked = result.writeLocked;
        return result;
      });
    },
    async flush() { await queue; await repository.flush(); },
  };
}
