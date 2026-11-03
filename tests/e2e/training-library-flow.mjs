import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';
import { createLineup } from '../../shared/lineups.js';
import { getBodyTypes, filterTacticsByBodyType } from '../../shared/tactic-body-types.js';
import { confirmedRoleArchive } from './role-fixtures.mjs';
import { libraryControls, libraryAction as a, libraryDialog as dialog, restoreFixture, assertNoPageOverflow } from './library-flow-helpers.mjs';

/** Real built-app proof, in the runner's isolated browser and local storage. */
export async function runTrainingLibraryFlow(context) {
  const { send, evaluate: e, wait, waitFor, folder } = context;
  const c = libraryControls(context), body = '#tactic-selection-panel';
  const backup = await e("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1'),width:innerWidth,height:innerHeight,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})");
  const out = { groups: [], layouts: [], catalogs: [], choices: [], background: [] };
  const snapshot = () => e('window.hoopalAppSnapshot()');
  const raw = () => e("localStorage.getItem('halfcourt-lineups-v1')");
  const archive = async () => JSON.parse(await raw());
  const facts = () => e("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1'),template:document.querySelector('#template-picker').value,progress:document.querySelector('#timeline-scrub').value,counter:document.querySelector('#frame-counter').textContent,players:document.querySelector('#players-layer').innerHTML})");
  const group = async (name, fn) => { const entry = { name, passed: false }; out.groups.push(entry); entry.detail = await fn(); entry.passed = true; };
  const shot = async name => { const s = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, `hc059-${name}.png`), Buffer.from(s.data, 'base64')); };
  const profile = (mode, id) => { const p = createLineup(mode, { id, name: `正式${mode}测试球队`, nbaTeamId: 'BOS' }); p.players.forEach((m, i) => { m.name = `队友${i + 1}`; m.number = i + 11; }); return p; };
  const three = profile('3v3', 'hc059-three'), four = profile('4v4', 'hc059-four');
  const normal = { schemaVersion: 2, profiles: [three, four], activeProfileId: three.id, rolePlans: {}, playbackContext: null };
  const fixture = (state = normal, id = 'pick-roll', frameIndex = 1) => restoreFixture(context, state, { templateId: id, frameIndex });
  const bodyPage = async () => { await c.click(a('change-body')); await waitFor(`!document.querySelector('${body}').hidden&&document.querySelector('${dialog}').dataset.phase==='closed'`); };
  const bodyChoose = id => c.click(`${body} [data-action=body-type][data-body-type="${id}"]`);
  const bodyApply = async () => { await c.click(`${body} [data-action=selection-view]`); await c.phase('open'); };
  async function fault(message) { await e(`(()=>{window.__hc059Set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='halfcourt-lineups-v1')throw Error(${JSON.stringify(message)});return __hc059Set.call(this,k,v)}})()`); }
  const restoreFault = () => e('if(window.__hc059Set){Storage.prototype.setItem=window.__hc059Set;delete window.__hc059Set}');
  async function actualHidden() {
    const target = (await send('Target.getTargetInfo')).targetInfo.targetId; let other;
    try {
      await send('Emulation.setFocusEmulationEnabled', { enabled: false });
      other = (await send('Target.createTarget', { url: 'about:blank', background: false })).targetId;
      await send('Target.activateTarget', { targetId: other });
      await waitFor('document.hidden===true'); const hidden = await snapshot(); await wait(1500); const later = await snapshot();
      return { hidden, later };
    } finally {
      if (other) await send('Target.closeTarget', { targetId: other });
      await send('Target.activateTarget', { targetId: target }); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    }
  }
  try {
    await fixture();
    await group('three tabs, static title and real library entry', async () => {
      assert.deepEqual(await e("[...document.querySelectorAll('[data-view-target]')].map(n=>n.dataset.viewTarget)"), ['lineups', 'play', 'archives']);
      assert.equal(await e("Boolean(document.querySelector('#training-picker-trigger'))"), false);
      await c.nav('play'); assert.equal(await e("document.querySelectorAll('#open-tactic-library').length"), 1);
      assert.equal(await e("document.querySelector('#training-title').textContent"), templates.find(t => t.id === 'pick-roll').title);
    });
    await group('opening pauses fractional clock, cancel preserves and restores focus', async () => {
      await c.click('#play-toggle'); await wait(1150); const running = await snapshot(); assert.equal(running.playing, true);
      await c.click('#open-tactic-library'); await c.phase('open'); const paused = await snapshot(); assert.equal(paused.playing, false); assert.ok(paused.position > 1 && paused.position % 1 !== 0);
      const before = await facts(); await wait(550); assert.equal((await snapshot()).position, paused.position); await c.close();
      assert.deepEqual(await facts(), before); assert.equal((await snapshot()).position, paused.position); assert.equal(await e('document.activeElement.id'), 'open-tactic-library');
      return { running, paused, returned: await snapshot() };
    });
    await group('450ms opening, closing isolation, keyboard trap and rapid close', async () => {
      await c.click('#open-tactic-library'); await wait(140);
      const middle = await e(`(()=>{const d=document.querySelector('${dialog}'),p=d.querySelector('section');return {phase:d.dataset.phase,transform:getComputedStyle(p).transform,filter:getComputedStyle(document.querySelector('.workspace')).filter}})()`);
      assert.equal(middle.phase, 'opening'); assert.notEqual(middle.transform, 'none'); assert.notEqual(middle.filter, 'none'); await c.phase('open');
      for (let i = 0; i < 18; i++) { await c.key('Tab'); assert.ok(await e(`document.querySelector('${dialog}').contains(document.activeElement)`)); }
      await c.key('Escape'); await wait(50); assert.equal(await e(`document.querySelector('${dialog}').dataset.phase`), 'closing');
      assert.ok(await e("[...document.querySelectorAll('[data-view-target],#play-toggle,#open-tactic-library')].every(n=>n.disabled||n.closest('[inert]'))"));
      await c.key('Escape'); await c.phase('closed'); assert.equal(await e("document.querySelectorAll('dialog[open]').length"), 0); return middle;
    });
    await group('real complete loop, switching retires old RAF, explicit use resets paused', async () => {
      await c.open(); assert.equal((await snapshot()).selection.expandedId, null);
      const ids = await e(`Array.from(document.querySelectorAll('${a('card')}'),n=>n.dataset.templateId)`); assert.ok(ids.length > 1);
      await c.expand(ids[0]); await wait(700); const moving = await snapshot(); assert.ok(moving.selection.preview.position > 0); assert.equal(moving.selection.preview.rafCount, 1);
      const frames = templates.find(t => t.id === ids[0]).build().frames.length;
      await wait(Math.ceil((frames - 1) * 2400 + 1500)); const cycle = await snapshot(); assert.ok(cycle.selection.preview.cycle >= 1); assert.equal(cycle.selection.preview.rafCount, 1);
      await e(`window.__hc059Old=document.querySelector('${a('preview')}')`); await c.expand(ids[1]);
      assert.deepEqual(await e('({playing:__hc059Old.dataset.playing,raf:__hc059Old.dataset.rafCount})'), { playing: 'false', raf: '0' });
      assert.equal((await snapshot()).templateId, 'pick-roll'); await c.click(a('play')); await c.phase('closed');
      const chosen = await snapshot(); assert.equal(chosen.templateId, ids[1]); assert.equal(chosen.position, 0); assert.equal(chosen.playing, false); return { moving, cycle, chosen };
    });
    await group('body header outside card, cancel no writes, failed preference retry', async () => {
      await c.open(); const before = await facts(); await bodyPage();
      const geometry = await e(`(()=>{const h=document.querySelector('${body} .selection-heading'),c=document.querySelector('${body} .selection-body-card'),a=h.getBoundingClientRect(),b=c.getBoundingClientRect();return{outside:!c.contains(h),bottom:a.bottom,top:b.top}})()`); assert.ok(geometry.outside && geometry.bottom <= geometry.top);
      await bodyChoose('two-big'); assert.deepEqual(await facts(), before); await c.click(`${body} [data-action=selection-back]`); await c.phase('open'); assert.deepEqual(await facts(), before);
      await bodyPage(); await bodyChoose('two-big'); await fault('HC059 preference denied'); await c.click(`${body} [data-action=selection-view]`); await waitFor(`document.querySelector('${body}').getAttribute('aria-busy')==='false'`);
      assert.equal(await e(`document.querySelector('${body} [data-action=body-type][aria-pressed=true]').dataset.bodyType`), 'two-big'); assert.equal(await raw(), before.archive); assert.ok(await e(`document.querySelector('${body}').textContent.includes('HC059 preference denied')||document.querySelector('${body}').textContent.includes('保存')`));
      await restoreFault(); await bodyApply(); assert.equal((await archive()).profiles.find(p => p.id === three.id).bodyType, 'two-big'); assert.equal((await snapshot()).templateId, before.template); await c.close(); return geometry;
    });
    await group('team entry locks size; per-team preference and other-size library browsing', async () => {
      await c.nav('lineups'); await c.click('[data-action=lineup-conditions]'); await c.phase('open'); assert.equal((await snapshot()).selection.mode, '3v3'); assert.ok(await e(`!document.querySelector('${a('mode')}')||document.querySelector('${a('mode')}').disabled`));
      assert.equal((await snapshot()).selection.bodyType, 'two-big'); await c.close();
      await c.open(); await c.mode('4v4'); const original = await raw(); await bodyPage(); await bodyChoose('three-big'); await bodyApply(); assert.equal(await raw(), original, 'unmatched mode cannot save a preference onto active three-person team');
      const ids = await e(`Array.from(document.querySelectorAll('${a('card')}'),n=>n.dataset.templateId)`); assert.ok(ids.length); assert.ok(ids.every(id => templates.find(t => t.id === id).mode === '4v4')); await c.close();
      await c.teams(); await c.click(`[data-action=lineup-select][data-profile-id="${four.id}"]`); await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition");
      await c.click('[data-action=lineup-conditions]'); await c.phase('open'); assert.equal((await snapshot()).selection.mode, '4v4'); assert.equal((await snapshot()).selection.bodyType, null); await bodyPage(); assert.equal(await e(`document.querySelectorAll('${body} [data-action=body-type]').length`), 4); await bodyChoose('one-big'); await bodyApply(); await c.close();
      const saved = await archive(); assert.equal(saved.profiles.find(p => p.id === three.id).bodyType, 'two-big'); assert.equal(saved.profiles.find(p => p.id === four.id).bodyType, 'one-big');
    });
    await group('source clear failure retains old play, exact raw plans and retry selection', async () => {
      const old = confirmedRoleArchive([three], three.id, 'post-split'); await fixture(old, 'post-split', 2); await c.open(); await c.expand('pick-roll'); const before = await facts(); const position = (await snapshot()).position;
      await fault('HC059 source clear denied'); await c.click(a('play')); await waitFor(`document.querySelector('${dialog} .lineup-glass-sheet').getAttribute('aria-busy')==='false'&&!document.body.classList.contains('is-loading')`);
      assert.deepEqual(await facts(), before); assert.equal((await snapshot()).position, position); assert.equal((await snapshot()).selection.expandedId, 'pick-roll'); assert.equal(await e(`document.querySelector('${dialog}').dataset.phase`), 'open');
      await restoreFault(); await c.click(a('play')); await c.phase('closed'); assert.equal((await archive()).playbackContext, null); assert.deepEqual((await archive()).rolePlans, old.rolePlans); assert.equal((await snapshot()).templateId, 'pick-roll'); assert.equal((await snapshot()).playing, false);
    });
    await group('all 26 real tactics load from the visible library and retain every step', async () => {
      await fixture({ schemaVersion: 2, profiles: [], activeProfileId: null, rolePlans: {}, playbackContext: null });
      for (const t of templates) {
        await c.open(); if ((await snapshot()).selection.mode !== t.mode) await c.mode(t.mode); await c.kind(t.kind); await c.choose(t.id);
        const frames = t.build().frames;
        assert.equal(await e("document.querySelectorAll('#frame-list button').length"), frames.length); assert.equal((await snapshot()).position, 0); assert.equal((await snapshot()).playing, false);
        await c.click(`#frame-list [data-frame-index="${frames.length - 1}"]`); const positions = await e("Object.fromEntries([...document.querySelectorAll('#players-layer [data-player]')].map(n=>{const m=n.transform.baseVal.consolidate().matrix;return[n.dataset.player,[m.e,m.f]]}))");
        for (const p of frames.at(-1).players) assert.ok(positions[p.id] && Math.hypot(positions[p.id][0] - p.x, positions[p.id][1] - p.y) < .001);
        out.choices.push({ id: t.id, mode: t.mode, kind: t.kind, frames: frames.length });
      }
    });
    await group('all 14 real body/size/category catalogs are reachable without wrong-size writes', async () => {
      const unchanged = await raw();
      for (const mode of ['3v3', '4v4']) for (const type of getBodyTypes(mode)) {
        await c.open(); if ((await snapshot()).selection.mode !== mode) await c.mode(mode); await bodyPage(); await bodyChoose(type.id); await bodyApply();
        for (const kind of ['offense', 'defense']) {
          await c.kind(kind); const actual = await e(`Array.from(document.querySelectorAll('${a('card')}'),n=>n.dataset.templateId)`); const expected = filterTacticsByBodyType(templates, { mode, kind, bodyType: type.id }).map(t => t.id); assert.deepEqual(actual, expected); assert.ok(actual.length); out.catalogs.push({ mode, kind, bodyType: type.id, ids: actual });
        } await c.close();
      } assert.equal(await raw(), unchanged);
    });
    await group('actual hidden tab pauses inline and main clocks without catchup', async () => {
      await fixture(); await c.open(); await c.expand('pick-roll'); await wait(650); assert.equal((await snapshot()).selection.preview.playing, true);
      const inline = await actualHidden(); assert.equal(inline.hidden.selection.preview.playing, false); assert.equal(inline.hidden.selection.preview.rafCount, 0); assert.equal(inline.later.selection.preview.position, inline.hidden.selection.preview.position); await wait(250); assert.equal((await snapshot()).selection.preview.position, inline.later.selection.preview.position); await c.close();
      await c.click('#play-toggle'); await wait(600); assert.equal((await snapshot()).playing, true); const main = await actualHidden(); assert.equal(main.hidden.playing, false); assert.equal(main.later.position, main.hidden.position); await wait(250); assert.equal((await snapshot()).position, main.later.position); out.background.push({ inline, main });
    });
    await group('five layouts: use/apply/back centres and both secondary headers', async () => {
      await fixture();
      for (const [width, height] of [[390, 844], [360, 640], [360, 400], [844, 390], [1024, 768]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }); await wait(80); await c.open(); await c.expand('pick-roll'); const use = await c.click(a('play')); await c.phase('closed');
        await c.open(); await bodyPage(); await bodyChoose('one-big'); const apply = await c.point(`${body} [data-action=selection-view]`); const geometry = await e(`(()=>{const h=document.querySelector('${body} .selection-heading'),c=document.querySelector('${body} .selection-body-card');return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bodyHeaderOutside:!c.contains(h),bodyHeader:h.getBoundingClientRect().toJSON(),bodyCard:c.getBoundingClientRect().toJSON()}})()`); assertNoPageOverflow(geometry); assert.ok(geometry.bodyHeaderOutside && geometry.bodyHeader.bottom <= geometry.bodyCard.top + 1); await shot(`${width}x${height}-body`); await bodyApply(); await c.close();
        await c.teams(); const team = await e("(()=>{const h=document.querySelector('#team-management-header'),c=document.querySelector('#team-management-card');return{outside:!c.contains(h),header:h.getBoundingClientRect().toJSON(),card:c.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}})()"); assertNoPageOverflow(team); assert.ok(team.outside && team.header.bottom <= team.card.top + 1); await c.point('[data-action=teams-back]'); await shot(`${width}x${height}-teams`); out.layouts.push({ width, height, use, apply, geometry, team });
      }
    });
    await group('reduced motion opens/closes and releases every modal lock', async () => { await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await c.open(); await c.close(); assert.equal(await e("document.querySelectorAll('dialog[open]').length"), 0); assert.ok(await e("[...document.querySelectorAll('[data-view-target]')].every(n=>!n.disabled)")); });
    await group('builtin selection write failure preserves precise old SVG and supports retry', async () => { await runBuiltinSelectionFailureFlow(context); });
  } finally {
    await restoreFault(); await e('delete window.__hc059Old');
    await send('Emulation.setDeviceMetricsOverride', { width: backup.width, height: backup.height, deviceScaleFactor: 1, mobile: backup.width < 600 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await restoreFixture(context, backup.archive, backup.selection); await send('Emulation.setEmulatedMedia', { features: backup.reduced ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] });
    assert.equal(await raw(), backup.archive); assert.equal(await e("localStorage.getItem('halfcourt-builtin-selection-v1')"), backup.selection);
    await writeFile(path.join(folder, 'hc059-training-library.json'), JSON.stringify(out, null, 2));
  }
}

/** Separate fault proof for save-before-load: a builtin-key failure must not replace the SVG. */
export async function runBuiltinSelectionFailureFlow(context) {
  const { send, evaluate: e, wait, waitFor, folder } = context, c = libraryControls(context);
  const backup = await e("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1')})");
  const facts = () => e("({snapshot:hoopalAppSnapshot(),archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1'),players:document.querySelector('#players-layer').innerHTML,ball:document.querySelector('#ball-layer').innerHTML,counter:document.querySelector('#frame-counter').textContent,progress:document.querySelector('#timeline-scrub').value})");
  const out = { passed: false };
  try {
    await restoreFixture(context, { schemaVersion: 2, profiles: [], activeProfileId: null, rolePlans: {}, playbackContext: null }, { templateId: 'post-split', frameIndex: 1 });
    await c.nav('play'); await c.click('#play-toggle'); await wait(1050); await c.click('#open-tactic-library'); await c.phase('open'); await c.expand('pick-roll');
    const before = await facts(); assert.ok(before.snapshot.position % 1 !== 0 && before.snapshot.position > 1);
    await e("(()=>{window.__hc059BuiltinAttempts=[];window.__hc059BuiltinSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='halfcourt-builtin-selection-v1'){__hc059BuiltinAttempts.push(JSON.parse(v));throw Error('HC059 builtin selection denied')}return __hc059BuiltinSet.call(this,k,v)}})()");
    await c.click(a('play')); await waitFor(`document.querySelector('${dialog} .lineup-glass-sheet').getAttribute('aria-busy')==='false'&&!document.body.classList.contains('is-loading')`);
    const failed = await facts(); assert.ok(await e('__hc059BuiltinAttempts.length>0'), 'the actual builtin save must reach the injected failure');
    assert.equal(failed.snapshot.templateId, before.snapshot.templateId); assert.equal(failed.snapshot.position, before.snapshot.position); assert.equal(failed.snapshot.playing, false); assert.equal(failed.snapshot.selection.expandedId, 'pick-roll');
    for (const key of ['archive', 'selection', 'players', 'ball', 'counter', 'progress']) assert.deepEqual(failed[key], before[key], `builtin write failure protects exact ${key}`);
    assert.equal(failed.snapshot.selection.phase, 'open');
    await e('Storage.prototype.setItem=window.__hc059BuiltinSet;delete window.__hc059BuiltinSet'); await c.click(a('play')); await c.phase('closed');
    const retried = await facts(); assert.equal(retried.snapshot.templateId, 'pick-roll'); assert.equal(retried.snapshot.position, 0); assert.equal(retried.snapshot.playing, false); assert.deepEqual(JSON.parse(retried.selection), { templateId: 'pick-roll', frameIndex: 0 });
    out.before = before; out.failed = failed; out.retried = retried; out.attempts = await e('__hc059BuiltinAttempts'); out.passed = true;
  } finally {
    await e('if(window.__hc059BuiltinSet){Storage.prototype.setItem=window.__hc059BuiltinSet;delete window.__hc059BuiltinSet}delete window.__hc059BuiltinAttempts');
    await restoreFixture(context, backup.archive, backup.selection);
    await writeFile(path.join(folder, 'hc059-builtin-selection-failure.json'), JSON.stringify(out, null, 2));
  }
}
