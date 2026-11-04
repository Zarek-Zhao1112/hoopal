import assert from 'node:assert/strict';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import { libraryControls, restoreFixture } from './library-flow-helpers.mjs';
import { waitForWizardMotion } from './wizard-helpers.mjs';

const archiveKey = 'halfcourt-lineups-v1';
const progressKey = 'halfcourt-builtin-selection-v1';
const editor = '#lineup-wizard-dialog';
const action = name => `${editor} [data-action="lineup-${name}"]`;
const roleToggle = action('player-role-toggle');
const roleOption = action('player-role-option');

export async function runTeamMainRolesFlow(context) {
  const { send, evaluate, waitFor } = context;
  const { click, key, nav, open, choose, phase, teams } = libraryControls(context);
  const backup = await evaluate(`[localStorage.getItem('${archiveKey}'),localStorage.getItem('${progressKey}')]`);
  function fixture(mode, id) {
    const profile = createLineup(mode, { id, name: `通用角色 ${mode}`, nbaTeamId: 'BOS', bodyType: mode === '4v4' ? 'two-big' : 'one-big' });
    return validateLineup({ ...profile, players: profile.players.map((member, index) => ({
      ...member, id: `${id}-${index}`, name: ['阿杰', '老周', '小林', '阿凯'][index], number: [7, 23, 11, 30][index],
    })) });
  }
  const four = fixture('4v4', 'hc063-four'), three = fixture('3v3', 'hc063-three');
  const disk = `JSON.parse(localStorage.getItem('${archiveKey}'))`;
  const numbers = () => evaluate("[...document.querySelectorAll('#players-layer [data-player^=attack] text')].map(n=>n.textContent)");
  const profile = id => `${disk}.profiles.find(p=>p.id===${JSON.stringify(id)})`;
  const saved = () => evaluate(`localStorage.getItem('${archiveKey}')`);
  const opened = () => waitFor(`document.querySelector('${editor}')?.dataset.phase==='open'`);
  const closed = () => waitFor(`!document.querySelector('${editor}')?.open`);
  const selectPlayer = async index => {
    await click(`${action('player')}[data-index="${index}"]`);
    await waitForWizardMotion(context);
  };
  const input = (name, value) => evaluate(`(() => {
    const field = document.querySelector(${JSON.stringify(action('player-' + name))});
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const value = name => evaluate(`document.querySelector(${JSON.stringify(action('player-' + name))}).value`);
  const roleValues = () => evaluate(`[...document.querySelectorAll(${JSON.stringify(roleOption)})].filter(n=>n.getClientRects().length).map(n=>n.dataset.value)`);
  const pick = async role => {
    if (await evaluate(`document.querySelector(${JSON.stringify(roleToggle)}).getAttribute('aria-expanded')`) !== 'true') await click(roleToggle);
    await click(`${roleOption}[data-value="${role}"]`);
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    await restoreFixture(context, { schemaVersion: 2, profiles: [four, three], activeProfileId: four.id, rolePlans: {}, playbackContext: null }, { templateId: 'pick-roll', frameIndex: 1 });
    const beforeEdit = await saved();
    await teams();
    await click(`[data-action=lineup-archive-menu][data-profile-id="${four.id}"]`);
    await click('#lineup-archive-menu [data-action=lineup-configure]');
    await opened();
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(action('player'))}).length`), 4);
    assert.equal(await evaluate("document.querySelectorAll('[data-action=lineup-role-settings]').length"), 0);
    await selectPlayer(0);
    await input('name', '新阿杰');
    await input('number', '17');
    await click(roleToggle);
    assert.deepEqual(await roleValues(), ['start', 'screen', 'relay', 'space', '']);
    await pick('start');
    await selectPlayer(1); await pick('relay');
    await selectPlayer(2); await pick('space');
    await selectPlayer(3); await pick('relay');
    await selectPlayer(0);
    assert.equal(await value('name'), '新阿杰');
    assert.equal(await value('number'), '17');
    await click(roleToggle);
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(roleOption + '[aria-pressed=true]')}).dataset.value`), 'start');
    await click(roleToggle);
    assert.equal(await saved(), beforeEdit, 'switching players and assigning repeated roles do not save early');
    await click(action('save'));
    await closed();
    const savedFour = await evaluate(profile(four.id));
    assert.equal(savedFour.revision, four.revision + 1);
    assert.deepEqual(savedFour.players.map(p => [p.name, p.number, p.mainRole]), [
      ['新阿杰', 17, 'start'], ['老周', 23, 'relay'], ['小林', 11, 'space'], ['阿凯', 30, 'relay'],
    ]);
    await nav('lineups');
    await click('[data-action=lineup-conditions]'); await phase('open'); await choose('high-low');
    await waitFor("document.body.dataset.view==='play' && document.body.dataset.lineupContext==='main-roles' && !document.body.dataset.pageTransition");
    assert.deepEqual(await numbers(), ['17','23','11','30']);
    await click('#open-note');
    assert.match(await evaluate("document.querySelector('#note-preview').textContent"), /17\s*号/);
    await key('Escape');
    await waitFor("!document.querySelector('#note-dialog').open");
    const beforeSwap = await evaluate(`localStorage.getItem('${archiveKey}')`);
    await click('#open-team-role-swap');
    await click('#team-role-swap-dialog button[type=submit]');
    assert.deepEqual(await numbers(), ['23','17','11','30']);
    assert.match(await evaluate("document.querySelector('#lineup-legend').textContent"), /临时调整/);
    assert.equal(await evaluate(`localStorage.getItem('${archiveKey}')`), beforeSwap);
    await click('#open-team-role-swap');
    await click('#team-role-swap-dialog .team-role-swap-actions button[type=button]');
    assert.deepEqual(await numbers(), ['17','23','11','30']);
    const beforeLibrary = await evaluate(`localStorage.getItem('${archiveKey}')`);
    await open(); await choose('high-low');
    await waitFor("!document.body.dataset.lineupContext");
    assert.deepEqual(await numbers(), ['1','2','3','4']);
    assert.equal(await evaluate(`localStorage.getItem('${archiveKey}')`), beforeLibrary);
    await teams();
    const openThree = async () => {
      await click(`[data-action=lineup-archive-menu][data-profile-id="${three.id}"]`);
      assert.equal(await evaluate("document.querySelectorAll('#lineup-archive-menu [data-action=lineup-role-settings]').length"), 0);
      await click('#lineup-archive-menu [data-action=lineup-configure]');
      await opened();
    };
    await openThree();
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(action('player'))}).length`), 3);
    await click(roleToggle);
    assert.deepEqual(await roleValues(), ['start', 'support', 'space', '']);
    await pick('support');
    await click(action('save')); await closed();
    assert.equal(await evaluate(`${profile(three.id)}.players[0].mainRole`), 'support');
    assert.equal(await evaluate(`${disk}.activeProfileId`), four.id, 'editing a different team does not activate it');

    const beforeCancel = await saved();
    await openThree();
    await pick('');
    await input('name', '要放弃的昵称');
    await click(action('player-config-cancel'));
    await click(action('draft-discard')); await closed();
    assert.equal(await saved(), beforeCancel, 'cancel and discard preserve both role and nickname');
    await openThree();
    await pick('');
    await click(action('save')); await closed();
    assert.equal(await evaluate(`Object.hasOwn(${profile(three.id)}.players[0], 'mainRole')`), false);
    assert.equal(await evaluate(`${profile(three.id)}.players[0].name`), '阿杰');
  } finally {
    await restoreFixture(context, ...backup);
    await send('Emulation.setEmulatedMedia', { features: [] });
    await nav('lineups');
  }
}
