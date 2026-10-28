import { createLineup } from '../../../../shared/lineups.js';

export const copy = value => JSON.parse(JSON.stringify(value));

/** In-memory drafts only. Rendering saved state must not overwrite these values. */
export function createLineupDrafts() {
  const store = {
    drafts: new Map(), baselines: new Map(),
    createDraft: null, createMembers: null,
    editorId: null, playerIndex: 0, editSection: 'identity',
    wizard: null, wizardMotionIntent: null,
    beginEdit(profile) {
      if (!store.drafts.has(profile.id)) {
        store.drafts.set(profile.id, copy(profile));
        store.baselines.set(profile.id, JSON.stringify(profile));
      }
      return store.drafts.get(profile.id);
    },
    beginCreate() {
      if (!store.createDraft) {
        // Keep a fourth stable member in memory when switching 3v3 / 4v4.
        store.createDraft = createLineup('4v4', { crest: 'shield', color: 'orange' });
        store.createMembers = store.createDraft.players;
        store.createDraft.mode = '3v3';
        store.createDraft.players = store.createMembers.slice(0, 3);
        store.createDraft.name = '';
        store.playerIndex = 0; store.editSection = 'identity';
      }
      return store.createDraft;
    },
    setCreateMode(mode) {
      if (!store.createDraft || !['3v3', '4v4'].includes(mode)) return;
      store.createDraft.mode = mode;
      store.createDraft.players = store.createMembers.slice(0, mode === '3v3' ? 3 : 4);
      store.playerIndex = Math.min(store.playerIndex, store.createDraft.players.length - 1);
    },
    discard(source) {
      if (source.kind === 'create') { store.createDraft = null; store.createMembers = null; }
      else { store.drafts.delete(source.id); store.baselines.delete(source.id); }
    },
    isDirty(id) { return store.drafts.has(id) && JSON.stringify(store.drafts.get(id)) !== store.baselines.get(id); },
    hasUnsavedChanges() { return [...store.drafts.keys()].some(store.isDirty) || Boolean(store.createDraft); },
  };
  return store;
}
