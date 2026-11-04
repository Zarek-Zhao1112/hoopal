import { NBA_TEAMS } from '../../../../data/nba-teams.js';
import { getNbaTeam } from '../../../../data/nba-teams.js';
import { validateLineup } from '../../../../shared/lineups.js';
import { copy } from './drafts.js';

/** Draft navigation and explicit commit policy; persistence stays with onAction. */
export function createLineupWizardController(context){
 const {selectedByProfile,sheet,draftStore,model,draw,destroyTeamCarousel,wizardView,dirty,perform}=context;

 function beginEdit(profile, memberId = selectedByProfile.get(profile.id), options = {}) {
    if (sheet.closing) return;
    const singlePlayerId = options.singlePlayer ? memberId : null;
    if (options.singlePlayer && !profile.players.some(player => player.id === singlePlayerId)) return;
    const draft = singlePlayerId ? copy(profile) : draftStore.beginEdit(profile);
    const originSection = model.section, originRoute = model.route;
    draftStore.editorId = profile.id; draftStore.playerIndex = Math.max(0, draft.players.findIndex(player => player.id === memberId)); draftStore.editSection = 'identity'; model.route = 'edit'; model.confirmation = null; model.feedback = '';
    draftStore.wizard = {
      kind: 'edit', id: profile.id, step: singlePlayerId ? 3 : options.step || 3, maxStep: 3,
      playerConfigOnly: Boolean(singlePlayerId || options.playerConfigOnly),
      originSection, originRoute, teamPage: Math.max(0, Math.floor(NBA_TEAMS.findIndex(team => team.id === draft.nbaTeamId) / 12)),
      ...(singlePlayerId ? { singlePlayerId, singlePlayerDraft: draft, singlePlayerBaseline: JSON.stringify(profile) } : {}),
    };
    draw();
  }

function openTeamPicker() { if (draftStore.wizard && !draftStore.wizard.singlePlayerId) { draftStore.wizard.step = 2; model.feedback = ''; draw(); } }

function beginCreate() {
    if (sheet.closing || model.state.profiles.length >= 20) return;
    draftStore.beginCreate();
    const originSection = model.section, originRoute = model.route;
    model.route = 'create'; model.confirmation = null; model.feedback = '';
    draftStore.wizard = { kind: 'create', id: draftStore.createDraft.id, step: 1, maxStep: 1, originSection, originRoute, teamPage: Math.max(0, Math.floor(NBA_TEAMS.findIndex(team => team.id === draftStore.createDraft.nbaTeamId) / 12)) }; draw();
  }

function wizardDraft() {
    const wizard = draftStore.wizard;
    if (wizard?.kind === 'create') return draftStore.createDraft;
    return wizard?.singlePlayerDraft ?? draftStore.drafts.get(wizard?.id);
  }

function closeWizard(discard = false) {
    if (!draftStore.wizard || model.pending || model.externalBusy || sheet.closing) return;
    const source = { ...draftStore.wizard };
    if (discard && !source.singlePlayerId) {
      draftStore.discard(source);
    }
    draftStore.wizard = null; model.confirmation = null; model.feedback = ''; model.section = source.originSection || model.section; model.route = source.originRoute === 'teams' ? 'teams' : 'profiles'; destroyTeamCarousel(); sheet.close(); draw();
  }

function requestWizardClose() {
    if (!draftStore.wizard || model.pending || model.externalBusy || sheet.closing) return;
    if (wizardView.carousel?.isAllOpen) { wizardView.carousel.closeAll(); return; }
    if (model.inspection) { model.inspection = null; draw(); return; }
    if (model.confirmation?.kind === 'wizard-draft') { model.confirmation = null; draw(); return; }
    const wizard = draftStore.wizard;
    const changed = wizard.singlePlayerId ? draftStore.isSinglePlayerDirty() : dirty(wizard.id);
    if (wizard.kind === 'create' || changed) {
      model.confirmation = { kind: 'wizard-draft', sourceRoute: draftStore.wizard.kind, editorId: draftStore.wizard.id }; draw();
    } else closeWizard();
  }

function wizardStep(step) {
    if (!draftStore.wizard || draftStore.wizard.singlePlayerId || step < 1 || step > 3 || step > draftStore.wizard.maxStep) return;
    const draft = wizardDraft();
    if (step > 1 && !draft.name.trim()) { model.feedback = '请先填写阵容名称。'; draftStore.wizard.step = 1; draw(); return; }
    if (step > 2 && draftStore.wizard.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { model.feedback = '请先选择一支 NBA 球队。'; draftStore.wizard.step = 2; draw(); return; }
    if (step === 3) draftStore.editSection = 'identity';
    if (step !== draftStore.wizard.step) draftStore.wizardMotionIntent = { kind: 'step', forward: step > draftStore.wizard.step };
    draftStore.wizard.step = step; model.feedback = ''; draw();
  }

function nextWizard() {
    const draft = wizardDraft(); if (!draft) return;
    if (draftStore.wizard.step === 1 && !draft.name.trim()) { model.feedback = '请填写阵容名称。'; draw(); return; }
    if (draftStore.wizard.step === 2 && draftStore.wizard.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { model.feedback = '请选择一支 NBA 球队。'; draw(); return; }
    draftStore.wizard.maxStep = Math.max(draftStore.wizard.maxStep, draftStore.wizard.step + 1); wizardStep(draftStore.wizard.step + 1);
  }

function saveWizard() {
    const draft = wizardDraft(), source = { ...draftStore.wizard };
    let profile;
    try {
      if (!draft.name.trim()) {
        if (!source.singlePlayerId) draftStore.wizard.step = 1;
        throw new Error('请填写阵容名称。');
      }
      if (source.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { draftStore.wizard.step = 2; throw new Error('请选择一支 NBA 球队。'); }
      if (draft.players.some(member => member.number === '')) throw new Error('请填写每名队员的球衣号码。');
      profile = validateLineup(copy(draft));
    } catch (error) { model.feedback = error.message; draw(); return; }
    perform(source.kind === 'create' ? 'create' : 'update', source.kind === 'create' ? profile : { profile }, () => {
      if (source.kind === 'create') draftStore.discard(source);
      else if (source.singlePlayerId) {
        const saved = model.state.profiles.find(item => item.id === source.id);
        if (saved) draftStore.rebaseAfterPlayerSave(JSON.parse(source.singlePlayerBaseline), saved, source.singlePlayerId);
      } else { draftStore.drafts.delete(source.id); draftStore.baselines.delete(source.id); }
      const savedId = source.kind === 'create' ? model.state.activeProfileId : source.id;
      const index = model.state.profiles.findIndex(item => item.id === savedId); if (index >= 0) model.profilePage = Math.floor(index / 3);
      model.section = source.originSection || model.section;
      draftStore.wizard = null; model.confirmation = null; model.route = source.originRoute === 'teams' ? 'teams' : 'profiles'; model.feedback = '配置已保存。'; destroyTeamCarousel();
      if (source.kind === 'create') model.afterSheetNavigation = 'lineups';
      sheet.close();
    });
  }

function wizardMemberReady(player, draft) {
    return Boolean(Number.isInteger(player.number) && player.number >= 0 && player.number <= 99 && draft.players.every(other => other.id === player.id || other.number !== player.number));
  }

function selectWizardPlayer(index) {
    const draft = wizardDraft();
    if (!draft || !draftStore.wizard || draftStore.wizard.singlePlayerId || draftStore.wizard.step !== 3 || model.pending || model.externalBusy || sheet.closing || wizardView.teamAllOpen || model.confirmation || model.inspection || !Number.isInteger(index) || index < 0 || index >= draft.players.length || index === draftStore.playerIndex) return;
    draftStore.wizardMotionIntent = { kind: 'player', forward: index > draftStore.playerIndex }; draftStore.playerIndex = index;
    if (draftStore.wizard.kind === 'edit') selectedByProfile.set(draft.id, draft.players[index].id);
    model.feedback = ''; draw();
  }

 return {beginEdit,openTeamPicker,beginCreate,wizardDraft,closeWizard,requestWizardClose,wizardStep,nextWizard,saveWizard,wizardMemberReady,selectWizardPlayer};
}
