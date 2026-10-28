import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createLineup } from '../../shared/lineups.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { findArchiveCard } from './archive-helpers.mjs';
import {waitForWizardMotion} from './wizard-helpers.mjs';

/** Real DOM and persistence checks in the runner's disposable browser profile. */
export async function runArchivesFlow({ send, evaluate, wait, waitFor, folder }) {
  const key = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1';
  const backup = await evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}')})`);
  const context = { evaluate, waitFor };
  const settled = () => waitFor("!document.body.dataset.pageTransition&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'");
  const action = async (name, extra = '') => {await evaluate(`document.querySelector(${JSON.stringify(`[data-action="${name}"]${extra}`)}).click()`);await waitForWizardMotion({waitFor})};
  const click = async selector => {
    const point = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Unhittable '+${JSON.stringify(selector)});return{x,y}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
  };
  const nav = async view => { await click(`[data-view-target="${view}"]`); await waitFor(`document.body.dataset.view===${JSON.stringify(view)}`); await settled(); };
  const reloadDocument = async () => {
    await evaluate('window.__hc033ReloadMarker=true');
    await send('Page.reload');
    await waitFor("!window.__hc033ReloadMarker&&document.readyState==='complete'");
  };
  const reload = async () => { await reloadDocument(); await waitFor("Boolean(document.querySelector('[data-action=lineup-open-archives],[data-action=lineup-configure]'))"); await settled(); };
  const facts = () => evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}'),template:document.querySelector('#template-picker').value,progress:document.querySelector('#timeline-scrub').value,source:document.body.dataset.lineupContext,board:document.querySelector('#players-layer').innerHTML})`);
  const escape = async () => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };
  const openMenu = async id => { await findArchiveCard(context, id); await click(`[data-action="lineup-archive-menu"][data-profile-id="${id}"]`); await waitFor("document.querySelector('#lineup-archive-menu').open"); };
  const closeWizard = async choice => { await action('lineup-wizard-close'); if (await evaluate("Boolean(document.querySelector('[data-action=lineup-draft-keep]'))")) await action(`lineup-draft-${choice}`); await waitFor("!document.querySelector('#lineup-wizard-dialog').open"); };
  const metrics = [];
  let readFailureScript;
  try {
    await evaluate(`localStorage.removeItem('${key}')`); await reload();
    assert.equal(await evaluate("document.querySelectorAll('#lineups-panel [data-action=lineup-create],#lineups-panel [data-action=lineup-create-empty]').length"), 0, 'locker does not contain an archive creation entry');
    await click('[data-action=lineup-open-archives]'); await waitFor("document.body.dataset.view==='archives'&&!document.body.dataset.pageTransition");
    assert.ok(await evaluate("Boolean(document.querySelector('.lineup-archives-empty'))"));
    await click('[data-action=lineup-create-empty]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    await evaluate("(()=>{const n=document.querySelector('[data-action=lineup-name]');n.value='仅在本次会话的档案草稿';n.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await closeWizard('keep');
    const emptyDisk = await evaluate(`localStorage.getItem('${key}')`);
    await nav('lineups'); await nav('archives'); await click('[data-action=lineup-create-empty]');
    await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-name]').value"), '仅在本次会话的档案草稿');
    assert.equal(await evaluate(`localStorage.getItem('${key}')`), emptyDisk, 'kept creation draft never writes a blank profile');
    await closeWizard('discard');

    const profiles = Array.from({ length: 7 }, (_, i) => {
      const p = createLineup(i % 2 ? '4v4' : '3v3', { id: `hc033-profile-${i}`, name: `档案验收球队 ${i + 1}`, nbaTeamId: ['BOS', 'LAL', 'CHI', 'MIA', 'NYK', 'BKN', 'MIL'][i] });
      p.players.forEach((member, j) => Object.assign(member, { id: `hc033-${i}-member-${j}`, name: `球队${i + 1}成员${j + 1}`, number: j + 11, height: 'medium', build: 'medium', mobility: 'average' }));
      return p;
    });
    const templateId = recommendLineup(profiles[0]).recommendations[0].templateId;
    profiles[0].recentTemplateId = templateId;
    const archive = { schemaVersion: 1, profiles, activeProfileId: profiles[0].id, playbackContext: { profileId: profiles[0].id, profileRevision: 1, templateId } };
    const fixtureSelection = JSON.stringify({ templateId, frameIndex: 1 });
    await evaluate(`localStorage.setItem('${key}',${JSON.stringify(JSON.stringify(archive))})`);
    const unreadRaw = await evaluate(`localStorage.getItem('${key}')`);
    // Intercept the actual startup read, before the application module runs.
    // The saved bytes remain readable through the original method for proof.
    // Seed progress after the outgoing document's real pagehide persistence,
    // before the incoming app reads it. Never suppress application lifecycle.
    const installed = await send('Page.addScriptToEvaluateOnNewDocument', { source: `(()=>{localStorage.setItem('${selectionKey}',${JSON.stringify(fixtureSelection)});window.hc033ReadOriginal=Storage.prototype.getItem;window.hc033ReadBlocked=true;window.hc033ReadFailures=0;Storage.prototype.getItem=function(k){if(k==='${key}'&&window.hc033ReadBlocked){window.hc033ReadFailures++;throw Error('HC033 startup read unavailable')}return window.hc033ReadOriginal.call(this,k)}})()` });
    readFailureScript = installed.identifier;
    await reloadDocument();
    await waitFor("Boolean(document.querySelector('[data-action=lineup-retry]'))&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'");
    assert.ok(await evaluate('window.hc033ReadFailures>0'), 'the real startup archive getItem was intercepted');
    for (const view of ['lineups', 'archives']) {
      await nav(view);
      const failed = await evaluate(`(()=>{const p=document.querySelector('#lineups-panel');return{text:p.textContent,locked:p.dataset.readLocked,create:p.querySelectorAll('[data-action=lineup-create],[data-action=lineup-create-empty]').length,empty:Boolean(p.querySelector('.lineup-archives-empty,.lineup-main-empty')),cards:p.querySelectorAll('.lineup-archive-card').length,retry:Boolean(p.querySelector('[data-action=lineup-retry]:not(:disabled)')),raw:window.hc033ReadOriginal.call(localStorage,'${key}')}})()`);
      assert.ok(/读取失败|无法读取/.test(failed.text), `${view}: actual getItem failure is visibly distinguished from an empty archive`);
      assert.equal(failed.create, 0, `${view}: unread archives cannot create profiles`);
      assert.equal(failed.locked, 'true', `${view}: startup read failure keeps the write lock visible`);
      assert.equal(failed.empty, false, `${view}: no fabricated empty archive`);
      assert.equal(failed.cards, 0); assert.equal(/0\s*\/\s*20/.test(failed.text), false, `${view}: unknown archive count is not shown as zero`);
      assert.equal(failed.retry, true); assert.equal(failed.raw, unreadRaw, `${view}: startup read failure preserves exact saved bytes`);
    }
    await evaluate('window.hc033ReadBlocked=false');
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: readFailureScript }); readFailureScript = null;
    await click('[data-action=lineup-retry]'); await settled();
    await waitFor("document.querySelectorAll('.lineup-archive-card').length===3&&!document.querySelector('[data-action=lineup-retry]')&&document.querySelector('#lineups-panel').dataset.readLocked==='false'");
    const recoveredIds = [];
    for (let page = 0; page < 3; page++) {
      recoveredIds.push(...await evaluate("[...document.querySelectorAll('.lineup-archive-card')].map(n=>n.dataset.profileId)"));
      if (page < 2) await click('[data-action=lineup-archives-next]');
    }
    assert.deepEqual(recoveredIds, profiles.map(p=>p.id), 'retry reads the real seven saved archives, rather than initializing a replacement');
    assert.equal(await evaluate(`localStorage.getItem('${key}')`), unreadRaw, 'successful retry itself never rewrites the restored archive');
    await evaluate('Storage.prototype.getItem=window.hc033ReadOriginal;delete window.hc033ReadOriginal;delete window.hc033ReadBlocked;delete window.hc033ReadFailures');
    await reload();
    const fixtureDiagnostics = await evaluate(`({selectionRaw:localStorage.getItem('${selectionKey}'),archiveRaw:localStorage.getItem('${key}'),archiveContext:JSON.parse(localStorage.getItem('${key}')).playbackContext,picker:document.querySelector('#template-picker').value,source:document.body.dataset.lineupContext,progress:document.querySelector('#timeline-scrub').value,readLocked:document.querySelector('#lineups-panel').dataset.readLocked})`);
    await writeFile(path.join(folder, 'hc033-fixture-diagnostics.json'), JSON.stringify(fixtureDiagnostics, null, 2));
    assert.equal(fixtureDiagnostics.selectionRaw, fixtureSelection, 'incoming fixture progress survives outgoing pagehide persistence');
    assert.equal(fixtureDiagnostics.source, profiles[0].id, `fixture restores an actual valid recommendation source: ${JSON.stringify(fixtureDiagnostics)}`);
    const baseline = await facts();
    for (const [width, height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await wait(100); await nav('archives');
      while (await evaluate("Boolean(document.querySelector('[data-action=lineup-archives-prev]:not(:disabled)'))")) await click('[data-action=lineup-archives-prev]');
      const seen = [];
      for (let page = 0; page < 3; page++) {
        const layout = await evaluate(`(()=>{const cards=[...document.querySelectorAll('.lineup-archive-card')],visible=n=>n.getClientRects().length;return{ids:cards.map(n=>n.dataset.profileId),current:cards.filter(n=>n.dataset.current==='true').map(n=>n.dataset.profileId),overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2,brand:visible(document.querySelector('#lineup-brand-header')),controls:[...document.querySelectorAll('.lineup-archives-card button,.view-nav button')].filter(n=>!n.disabled&&visible(n)).map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:n.dataset.action||n.dataset.viewTarget,inside:r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:h===n||n.contains(h)}})}})()`);
        assert.equal(layout.ids.length, page < 2 ? 3 : 1); assert.equal(layout.overflow, false, `${width}x${height} archive is one screen`); assert.equal(layout.brand, 0, 'brand belongs only to locker');
        assert.ok(layout.controls.every(n=>n.inside&&n.hit), `${width}x${height} page ${page}: card, management, create, pager and four nav centers are reachable`);
        seen.push(...layout.ids); if (page < 2) await click('[data-action=lineup-archives-next]');
      }
      assert.deepEqual(seen, profiles.map(p=>p.id)); metrics.push({ width, height, seen });
      const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, `hc033-archives-${width}-${height}.png`), Buffer.from(shot.data, 'base64'));
    }
    assert.deepEqual(await facts(), baseline, 'all browsing/pages/resizes preserve exact archive, progress, board and source');

    await findArchiveCard(context, profiles[0].id); await click(`[data-action=lineup-select][data-profile-id="${profiles[0].id}"]`);
    await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition");
    assert.deepEqual(await facts(), baseline, 'selecting the already active archive preserves its valid recommendation source');
    const target = profiles[4]; await findArchiveCard(context, target.id);
    await evaluate(`(()=>{window.hc033SetItem=Storage.prototype.setItem;window.hc033Attempts=0;Storage.prototype.setItem=function(k,v){if(k==='${key}'){window.hc033Attempts++;throw Error('HC033 selection blocked')}return window.hc033SetItem.call(this,k,v)}})()`);
    await click(`[data-action=lineup-select][data-profile-id="${target.id}"]`);
    await waitFor("document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&document.querySelector('#lineups-panel').textContent.includes('HC033 selection blocked')");
    assert.equal(await evaluate('document.body.dataset.view'), 'archives');
    assert.deepEqual(await facts(), baseline, 'failed select preserves original raw storage, play and recommendation source');
    assert.ok(await evaluate(`Boolean(document.querySelector('.lineup-archive-card[data-profile-id="${target.id}"]'))`), 'failed select stays on its archive page');
    await evaluate('Storage.prototype.setItem=window.hc033SetItem');
    await click(`[data-action=lineup-select][data-profile-id="${target.id}"]`); await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition"); await settled();
    const selected = await evaluate(`JSON.parse(localStorage.getItem('${key}'))`);
    assert.equal(selected.activeProfileId, target.id); assert.equal(selected.playbackContext, null); assert.equal(await evaluate("localStorage.getItem('halfcourt-builtin-selection-v1')"), baseline.selection);
    assert.equal(await evaluate("document.querySelector('.lineup-profile-card .locker-scene').dataset.profileId"), target.id);

    const managed = profiles[1]; await openMenu(managed.id);
    const beforeMenu = await facts();
    assert.ok(await evaluate("[...document.querySelectorAll('[data-view-target]')].every(n=>n.disabled&&n.tabIndex===-1)"), 'menu isolates all four navigation buttons');
    await evaluate("document.querySelector('#lineup-archive-menu button:last-of-type').focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.ok(await evaluate("document.querySelector('#lineup-archive-menu').contains(document.activeElement)"), 'native management menu traps keyboard focus');
    await action('lineup-delete'); await action('lineup-delete-cancel');
    assert.deepEqual(await facts(), beforeMenu, 'delete cancel does not select or alter a noncurrent profile');
    await escape(); await waitFor("!document.querySelector('#lineup-archive-menu').open");
    assert.equal(await evaluate('document.activeElement.dataset.profileId'), managed.id); assert.equal(await evaluate('document.activeElement.dataset.action'), 'lineup-archive-menu');
    await openMenu(managed.id); await click('#lineup-archive-menu [data-action=lineup-configure]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"), '3');
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#lineup-wizard-dialog [data-action=lineup-player]')].map(n=>n.dataset.playerId)"), managed.players.map(p=>p.id), 'noncurrent configuration opens the managed roster without selecting it');
    await closeWizard('discard'); assert.deepEqual(await facts(), beforeMenu);
    await openMenu(managed.id); await click('#lineup-archive-menu [data-action=lineup-archive-rename]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"), '1');
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-team-name]').value"), managed.name);
    await evaluate("(()=>{const n=document.querySelector('[data-action=lineup-team-name]');n.value='管理未使用球队的草稿';n.dispatchEvent(new Event('input',{bubbles:true}))})()"); await closeWizard('keep');
    assert.deepEqual(await facts(), beforeMenu, 'kept noncurrent rename draft leaves active team and disk unchanged');
    await nav('lineups'); await openMenu(managed.id); await action('lineup-archive-rename'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-team-name]').value"), '管理未使用球队的草稿');
    await action('lineup-wizard-step','[data-step="3"]'); await action('lineup-save'); await waitFor("!document.querySelector('#lineup-wizard-dialog').open"); await settled();
    assert.equal(await evaluate('document.body.dataset.view'), 'archives');
    const renamed = await evaluate(`JSON.parse(localStorage.getItem('${key}'))`); assert.equal(renamed.activeProfileId, target.id); assert.equal(renamed.profiles.find(p=>p.id===managed.id).name, '管理未使用球队的草稿'); assert.equal(renamed.profiles.find(p=>p.id===managed.id).revision, 2);
    await openMenu(managed.id); await action('lineup-delete'); await click('#lineup-archive-menu [data-action=lineup-delete-confirm]'); await waitFor(`!document.querySelector('#lineup-archive-menu').open&&JSON.parse(localStorage.getItem('${key}')).profiles.length===6`);
    const removed = await evaluate(`JSON.parse(localStorage.getItem('${key}'))`); assert.equal(removed.activeProfileId, target.id); assert.ok(!removed.profiles.some(p=>p.id===managed.id));
    await writeFile(path.join(folder, 'hc033-archives-flow.json'), JSON.stringify({ metrics, startupReadFailurePreservedRaw: true, readRetryRecoveredIds: recoveredIds, sameActivePreservedSource: true, failedSelectionPreservedRaw: true, retrySelected: target.id, managedNoncurrent: managed.id, keptDraft: true, cancelledDelete: true, menuFocusRestored: true }, null, 2));
  } finally {
    if (readFailureScript) await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: readFailureScript });
    await evaluate('(()=>{if(window.hc033ReadOriginal)Storage.prototype.getItem=window.hc033ReadOriginal;delete window.hc033ReadOriginal;delete window.hc033ReadBlocked;delete window.hc033ReadFailures})()');
    await evaluate('(()=>{if(window.hc033SetItem)Storage.prototype.setItem=window.hc033SetItem})()');
    const restoreStorage = `(()=>{${backup.archive===null?`localStorage.removeItem('${key}')`:`localStorage.setItem('${key}',${JSON.stringify(backup.archive)})`};${backup.selection===null?`localStorage.removeItem('${selectionKey}')`:`localStorage.setItem('${selectionKey}',${JSON.stringify(backup.selection)})`}})()`;
    // Restore after pagehide as well, so this isolated flow cannot leak its
    // final main-play progress into the next regression's original backup.
    await evaluate(restoreStorage);
    const restoreScript = await send('Page.addScriptToEvaluateOnNewDocument', { source: restoreStorage });
    try { await reload(); }
    finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: restoreScript.identifier }); }
  }
}
