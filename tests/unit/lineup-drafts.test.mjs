import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { createLineupDrafts } from '../../frontend/src/lineups/wizard/drafts.js';
import { createLineupWizardController } from '../../frontend/src/lineups/wizard/controller.js';

const profile = (id = 'profile-a') => createLineup('3v3', { id, name: '已保存阵容', nbaTeamId: 'BOS' });
function harness() {
  const draftStore = createLineupDrafts(), saved = profile();
  const model = { state: { profiles: [saved], activeProfileId: saved.id }, section: 'archives', route: 'profiles', confirmation: null, inspection: null, pending: false, externalBusy: false, feedback: '' };
  let closes = 0, draws = 0, commits = [];
  const context = {
    model, draftStore, selectedByProfile: new Map(), sheet: { closing: false, close() { closes++; } },
    draw() { draws++; }, destroyTeamCarousel() {}, wizardView: { teamAllOpen: false, carousel: null }, dirty: draftStore.isDirty,
    perform(kind, payload, success) { commits.push({ kind, payload, success }); },
  };
  return { ...context, controller: createLineupWizardController(context), saved, get closes() { return closes; }, get draws() { return draws; }, commits };
}

test('editing clones saved data once and retains dirty input through new saved revisions', () => {
  const drafts = createLineupDrafts(), saved = profile();
  const draft = drafts.beginEdit(saved);
  assert.notEqual(draft, saved); assert.notEqual(draft.players[0], saved.players[0]);
  draft.players[0].name = '本次输入';
  const next = { ...saved, revision: saved.revision + 1, name: '外部最新版本' };
  assert.equal(drafts.beginEdit(next), draft);
  assert.equal(draft.players[0].name, '本次输入'); assert.equal(saved.players[0].name, '');
  assert.equal(draft.revision, saved.revision, 'UI must not silently bypass the session revision check');
  assert.equal(drafts.isDirty(saved.id), true);
});

test('3v3/4v4 switching retains the same fourth player and stable create IDs', () => {
  const drafts = createLineupDrafts(), create = drafts.beginCreate(), id = create.id;
  assert.equal(create.mode, '3v3'); assert.equal(create.players.length, 3);
  drafts.setCreateMode('4v4'); const fourth = create.players[3]; fourth.name = '第四人草稿';
  drafts.playerIndex = 3; drafts.setCreateMode('3v3'); assert.equal(drafts.playerIndex, 2);
  drafts.setCreateMode('4v4'); assert.equal(create.players[3], fourth); assert.equal(fourth.name, '第四人草稿');
  assert.equal(drafts.beginCreate().id, id); assert.equal(drafts.beginCreate(), create);
});

test('discarding creation and editing keeps the unrelated session draft', () => {
  const drafts = createLineupDrafts(), saved = profile(), editing = drafts.beginEdit(saved);
  editing.name = '保留的编辑'; const creating = drafts.beginCreate(); creating.name = '保留的新建';
  drafts.discard({ kind: 'create' }); assert.equal(drafts.drafts.get(saved.id), editing); assert.equal(drafts.isDirty(saved.id), true);
  drafts.beginCreate().name = '第二份新建'; const secondCreate = drafts.createDraft;
  drafts.discard({ kind: 'edit', id: saved.id }); assert.equal(drafts.createDraft, secondCreate); assert.equal(secondCreate.name, '第二份新建');
  assert.equal(drafts.hasUnsavedChanges(), true);
});

test('opening a non-current member binds the edit to that profile and member', () => {
  const h = harness(); h.model.route = 'recommendations';
  h.selectedByProfile.set(h.saved.id, h.saved.players[2].id);
  h.controller.beginEdit(h.saved);
  assert.equal(h.draftStore.editorId, h.saved.id); assert.equal(h.draftStore.playerIndex, 2);
  assert.equal(h.draftStore.wizard.originSection, 'archives'); assert.equal(h.draftStore.wizard.originRoute, 'recommendations');
  assert.equal(h.draftStore.wizard.step, 3); assert.equal(h.commits.length, 0);
});

test('discard close binds to the active wizard, not another retained draft', () => {
  const h = harness(); h.controller.beginEdit(h.saved); h.draftStore.drafts.get(h.saved.id).name = '留下编辑';
  h.controller.beginCreate(); h.controller.closeWizard(true);
  assert.equal(h.draftStore.drafts.get(h.saved.id).name, '留下编辑'); assert.equal(h.closes, 1); assert.equal(h.commits.length, 0);
  h.controller.beginCreate(); h.draftStore.createDraft.name = '留下创建';
  h.controller.beginEdit(h.saved); h.controller.closeWizard(true);
  assert.equal(h.draftStore.createDraft.name, '留下创建'); assert.equal(h.draftStore.drafts.has(h.saved.id), false);
});

test('new creation rejects neutral team and incomplete traits before committing', () => {
  const h = harness(); h.controller.beginCreate(); const draft = h.draftStore.createDraft; draft.name = '新建阵容';
  h.controller.saveWizard(); assert.equal(h.commits.length, 0); assert.equal(h.draftStore.wizard.step, 2);
  draft.nbaTeamId = 'BOS'; h.draftStore.wizard.step = 3; h.controller.saveWizard();
  assert.equal(h.commits.length, 0); assert.equal(h.draftStore.editSection, 'traits'); assert.match(h.model.feedback, /每名队员/);
});

test('save sends one complete isolated snapshot and only success clears that draft', () => {
  const h = harness(); h.controller.beginCreate(); const draft = h.draftStore.createDraft;
  draft.name = '完整新建'; draft.nbaTeamId = 'BOS';
  for (const player of draft.players) Object.assign(player, { height: 'medium', build: 'medium', mobility: 'average' });
  h.controller.saveWizard(); assert.equal(h.commits.length, 1);
  const call = h.commits[0]; assert.equal(call.kind, 'create'); assert.equal(call.payload.id, draft.id);
  assert.equal(call.payload.players.length, 3); assert.deepEqual(call.payload.players.map(p => p.id), draft.players.map(p => p.id));
  draft.players[0].name = '提交后继续输入'; assert.notEqual(call.payload.players[0].name, draft.players[0].name);
  assert.equal(h.draftStore.createDraft, draft, 'a false/rejected commit does not call success and retains all input');
  assert.equal(h.closes, 0);
  h.model.state = { profiles: [call.payload], activeProfileId: call.payload.id }; call.success();
  assert.equal(h.draftStore.createDraft, null); assert.equal(h.closes, 1); assert.equal(h.model.afterSheetNavigation, 'lineups');
});

test('legacy neutral incomplete edit saves without creation-only rules or revision rewrites', () => {
  const h = harness(); h.saved.nbaTeamId = null; h.controller.beginEdit(h.saved);
  const draft = h.draftStore.drafts.get(h.saved.id); draft.players[0].name = '旧队新昵称';
  h.controller.saveWizard(); assert.equal(h.commits.length, 1); assert.equal(h.commits[0].kind, 'update');
  assert.equal(h.commits[0].payload.profile.nbaTeamId, null); assert.equal(h.commits[0].payload.profile.revision, h.saved.revision);
  assert.equal(h.draftStore.drafts.get(h.saved.id), draft); assert.equal(h.closes, 0);
});
