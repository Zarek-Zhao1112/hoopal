import assert from 'node:assert/strict';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import { libraryControls, restoreFixture } from './library-flow-helpers.mjs';

const archiveKey = 'halfcourt-lineups-v1';
const progressKey = 'halfcourt-builtin-selection-v1';
const roleDialog = '#lineup-main-roles-dialog';
const action = name => `[data-action="lineup-role-${name}"]`;

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
  const pick = async (index, role) => {
    await click(`${roleDialog} ${action('toggle')}[aria-controls][data-member-id="${four.players[index].id}"]`);
    await click(`${roleDialog} ${action('option')}[data-role="${role}"]:not([hidden] *)`);
  };
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  try {
    await restoreFixture(context, { schemaVersion: 2, profiles: [four, three], activeProfileId: four.id, rolePlans: {}, playbackContext: null }, { templateId: 'pick-roll', frameIndex: 1 });
    await click(`[data-action=lineup-role-settings][data-profile-id="${four.id}"]`);
    await waitFor(`document.querySelector('${roleDialog}')?.dataset.phase==='open'`);
    assert.equal(await evaluate(`document.querySelectorAll('${roleDialog} ${action('toggle')}').length`), 4);
    await pick(0, 'start'); await pick(1, 'relay'); await pick(2, 'space'); await pick(3, 'relay');
    await click(`${roleDialog} ${action('save')}`);
    await waitFor(`!document.querySelector('${roleDialog}')?.open`);
    assert.deepEqual(await evaluate(`${disk}.profiles[0].players.map(p=>p.mainRole)`), ['start', 'relay', 'space', 'relay']);
    await click('[data-action=lineup-conditions]'); await phase('open'); await choose('high-low');
    await waitFor("document.body.dataset.view==='play' && document.body.dataset.lineupContext==='main-roles' && !document.body.dataset.pageTransition");
    assert.deepEqual(await numbers(), ['7','23','11','30']);
    await click('#open-note');
    assert.match(await evaluate("document.querySelector('#note-preview').textContent"), /7\s*号/);
    await key('Escape');
    await waitFor("!document.querySelector('#note-dialog').open");
    const beforeSwap = await evaluate(`localStorage.getItem('${archiveKey}')`);
    await click('#open-team-role-swap');
    await click('#team-role-swap-dialog button[type=submit]');
    assert.deepEqual(await numbers(), ['23','7','11','30']);
    assert.match(await evaluate("document.querySelector('#lineup-legend').textContent"), /临时调整/);
    assert.equal(await evaluate(`localStorage.getItem('${archiveKey}')`), beforeSwap);
    await click('#open-team-role-swap');
    await click('#team-role-swap-dialog .team-role-swap-actions button[type=button]');
    assert.deepEqual(await numbers(), ['7','23','11','30']);
    const beforeLibrary = await evaluate(`localStorage.getItem('${archiveKey}')`);
    await open(); await choose('high-low');
    await waitFor("!document.body.dataset.lineupContext");
    assert.deepEqual(await numbers(), ['1','2','3','4']);
    assert.equal(await evaluate(`localStorage.getItem('${archiveKey}')`), beforeLibrary);
    await teams(); await click(`[data-action=lineup-select][data-profile-id="${three.id}"]`);
    await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition");
    await click(`[data-action=lineup-role-settings][data-profile-id="${three.id}"]`);
    await waitFor(`document.querySelector('${roleDialog}')?.dataset.phase==='open'`);
    await click(`${roleDialog} ${action('toggle')}[aria-controls][data-member-id="${three.players[0].id}"]`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${roleDialog} ${action('option')}')].filter(n=>n.getClientRects().length).map(n=>n.dataset.role)`), ['start','support','space','']);
    await key('Escape'); await waitFor(`!document.querySelector('${roleDialog}')?.open`);
  } finally {
    await restoreFixture(context, ...backup);
    await send('Emulation.setEmulatedMedia', { features: [] });
    await nav('lineups');
  }
}
