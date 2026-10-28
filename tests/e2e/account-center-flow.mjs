import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createLineup } from '../../shared/lineups.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { findArchiveCard } from './archive-helpers.mjs';

/** Real local records and the honest unavailable-account UI, never preview data. */
export async function runAccountCenterFlow({ send, evaluate, wait, waitFor, folder }) {
  const key = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1', dialog = '#lineup-account-dialog';
  const context = { evaluate, waitFor }, layouts = [], dialogs = [], motions = [];
  const backup = await evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}')})`);
  const visible = "n=>n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden'";
  const snapshot = () => evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}'),source:document.body.dataset.lineupContext,template:document.querySelector('#template-picker').value,progress:document.querySelector('#timeline-scrub').value,players:document.querySelector('#players-layer').innerHTML})`);
  const storage = () => evaluate("Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))");
  const action = (name, extra = '') => evaluate(`document.querySelector(${JSON.stringify(`[data-action="${name}"]${extra}`)}).click()`);
  const clickPoint = async point => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 }); };
  const click = async selector => {
    const point = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)});return{x,y}})()`);
    await clickPoint(point);
  };
  const keyEvent = async (key, code = key, shiftKey = false) => { const windowsVirtualKeyCode = key === 'Tab' ? 9 : 27; await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, modifiers: shiftKey ? 8 : 0 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode, modifiers: shiftKey ? 8 : 0 }); };
  const nav = async view => { await click(`[data-view-target="${view}"]`); await waitFor(`document.body.dataset.view===${JSON.stringify(view)}&&!document.body.dataset.pageTransition`); };
  const shot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, name), Buffer.from(result.data, 'base64')); };
  const replaceDocument = async (archive, selection) => {
    // The outgoing page may persist its own progress. Install fixtures only in
    // the incoming document, preserving the real pagehide implementation.
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const script = await send('Page.addScriptToEvaluateOnNewDocument', { source: `${archive === null ? `localStorage.removeItem('${key}')` : `localStorage.setItem('${key}',${JSON.stringify(archive)})`};${selection === null ? `localStorage.removeItem('${selectionKey}')` : `localStorage.setItem('${selectionKey}',${JSON.stringify(selection)})`};window.__hc046Document=true;` });
    try { await evaluate('window.__hc046Document=false'); await send('Page.reload'); await waitFor("window.__hc046Document===true&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'"); }
    finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier }); await send('Emulation.setEmulatedMedia', { features: [] }); }
  };
  const auditStart = () => evaluate(`(()=>{
    if(window.__hc046RestoreAudit)throw Error('Nested account audit');
    const set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear,fetch=window.fetch,open=XMLHttpRequest.prototype.open;
    window.__hc046Audit={writes:[],requests:[]};
    Storage.prototype.setItem=function(k,v){window.__hc046Audit.writes.push({operation:'set',key:k});return set.call(this,k,v)};
    Storage.prototype.removeItem=function(k){window.__hc046Audit.writes.push({operation:'remove',key:k});return remove.call(this,k)};
    Storage.prototype.clear=function(){window.__hc046Audit.writes.push({operation:'clear'});return clear.call(this)};
    window.fetch=function(...args){window.__hc046Audit.requests.push(String(args[0]?.url||args[0]));return fetch.apply(this,args)};
    XMLHttpRequest.prototype.open=function(...args){window.__hc046Audit.requests.push(String(args[1]));return open.apply(this,args)};
    window.__hc046RestoreAudit=()=>{Storage.prototype.setItem=set;Storage.prototype.removeItem=remove;Storage.prototype.clear=clear;window.fetch=fetch;XMLHttpRequest.prototype.open=open;const log=window.__hc046Audit;delete window.__hc046RestoreAudit;delete window.__hc046Audit;return log};
  })()`);
  const auditEnd = () => evaluate('window.__hc046RestoreAudit()');
  const motionState = () => evaluate(`(()=>{const d=document.querySelector('${dialog}'),p=d.querySelector('.lineup-account-sheet');return{phase:d.dataset.phase,kind:d.dataset.kind,top:p.getBoundingClientRect().top,transform:getComputedStyle(p).transform,opacity:Number(getComputedStyle(p).opacity),durations:document.getAnimations().map(a=>a.effect?.getTiming().duration)}})()`);

  async function explain(kind, close = 'local', { reduced = false, label = '' } = {}) {
    const trigger = `lineup-${kind}-open`, before = await snapshot(), beforeStorage = await storage();
    await auditStart();
    await evaluate(`document.querySelector('[data-action=${trigger}]').focus()`); await click(`[data-action=${trigger}]`);
    await waitFor(`document.querySelector('${dialog}').open&&document.querySelector('${dialog}').dataset.visible==='true'`);
    const points = [];
    if (!reduced) { await wait(90); points.push(await motionState()); await wait(150); points.push(await motionState()); }
    await waitFor(`document.querySelector('${dialog}').dataset.phase==='open'`);
    const final = await motionState(); points.push(final);
    if (!reduced) { assert.equal(points[0].phase, 'opening'); assert.ok(points[0].durations.includes(450), 'real account sheet uses the approved 450ms transition'); assert.ok(points[0].top > final.top + 2, 'account sheet visibly moves between early and final frames'); }
    else { assert.ok(!final.durations.some(duration => duration === 450), 'reduced motion has no active 450ms transition'); }
    assert.equal(final.kind, kind); assert.equal(await evaluate("document.querySelectorAll('dialog[open]').length"), 1, 'one owned modal, without opening the wizard underneath');
    assert.ok(await evaluate(`[...document.querySelectorAll('[id]')].map(n=>n.id).length===new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size`), 'account and wizard IDs remain unique');
    const result = await evaluate(`(()=>{const d=document.querySelector('${dialog}'),p=d.querySelector('.lineup-account-sheet'),r=p.getBoundingClientRect(),title=d.querySelector('#lineup-account-title'),range=document.createRange();range.selectNodeContents(title);const t=range.getBoundingClientRect();return{label:${JSON.stringify(label)},kind:d.dataset.kind,title:title.textContent,text:d.textContent,inputs:d.querySelectorAll('input,textarea,select,form').length,panel:r.toJSON(),titleFits:t.top>=r.top-1&&t.bottom<=r.bottom+1,overflow:document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2,controls:[...d.querySelectorAll('button')].filter(${visible}).map(n=>{const b=n.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{action:n.dataset.action,fit:b.width>0&&b.height>0&&b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,hit:h===n||n.contains(h)}})}})()`);
    assert.equal(result.inputs, 0, 'unavailable service never collects credentials');
    if (['account', 'backup'].includes(kind)) assert.match(result.text, /尚未开放|暂未开放|尚未接入/);
    assert.equal(result.overflow, false); assert.equal(result.titleFits, true); assert.ok(result.controls.length >= 2 && result.controls.every(n => n.fit && n.hit), 'all real explanation controls fit and are hittable');
    assert.ok(await evaluate("[...document.querySelectorAll('[data-view-target]')].every(n=>n.disabled&&n.tabIndex===-1)"), 'owned account modal isolates the four navigation buttons');
    await evaluate("document.querySelector('[data-view-target=play]').click();document.querySelector('[data-action=lineup-create],[data-action=lineup-create-empty]')?.click()");
    assert.equal(await evaluate('document.body.dataset.view'), 'archives'); assert.equal(await evaluate("document.querySelector('#lineup-wizard-dialog').open"), false, 'background creation is blocked');
    await evaluate(`(()=>{const a=[...document.querySelectorAll('${dialog} button')].filter(n=>!n.disabled&&n.getClientRects().length);a.at(-1).focus()})()`); await keyEvent('Tab');
    assert.ok(await evaluate(`document.querySelector('${dialog}').contains(document.activeElement)`), 'Tab stays in the explanation');
    await keyEvent('Tab', 'Tab', true); assert.ok(await evaluate(`document.querySelector('${dialog}').contains(document.activeElement)`), 'reverse Tab stays in the explanation');
    if (label.includes('multi')) await shot(`hc046-${label}-${kind}.png`);
    if (close === 'escape') await keyEvent('Escape');
    else if (close === 'cancel') await evaluate(`document.querySelector('${dialog}').dispatchEvent(new Event('cancel',{cancelable:true}))`);
    else if (close === 'shade') { const point = await evaluate(`(()=>{const p=document.querySelector('${dialog} .lineup-account-sheet').getBoundingClientRect();return{x:4,y:Math.max(4,p.top-8)}})()`); await clickPoint(point); }
    else await click(`${dialog} [data-action=lineup-account-${close}]`);
    if (!reduced) { assert.equal(await evaluate(`document.querySelector('${dialog}').dataset.phase`), 'closing'); assert.ok(await evaluate("[...document.querySelectorAll('[data-view-target]')].every(n=>n.disabled)"), 'closing continues to lock the background'); }
    await waitFor(`!document.querySelector('${dialog}').open&&document.querySelector('${dialog}').dataset.phase==='closed'`);
    assert.equal(await evaluate('document.activeElement.dataset.action'), trigger, 'focus returns to the actual information entry');
    const audit = await auditEnd(); assert.deepEqual(audit.writes, [], 'information panels perform no Storage writes, removals or clears'); assert.deepEqual(audit.requests, [], 'information panels make no fetch/XHR service requests');
    assert.deepEqual(await storage(), beforeStorage, 'no hidden account or synchronization keys appear'); assert.deepEqual(await snapshot(), before, 'information panels preserve the current play, source and local records');
    dialogs.push(result); motions.push({ label, kind, reduced, close, samples: points });
  }

  const make = (mode, index) => { const profile = createLineup(mode, { id: `hc046-${index}`, name: `真实页面验收球队 ${index + 1}`, nbaTeamId: index % 2 ? 'LAL' : 'BOS' }); profile.players.forEach((member, j) => Object.assign(member, { id: `hc046-${index}-member-${j}`, name: `球队${index + 1}成员${j + 1}`, number: j + 11, height: 'medium', build: 'medium', mobility: 'agile', strengths: ['passing', 'shooting'], weaknesses: [] })); return profile; };
  const cases = [{ name: 'empty', profiles: [] }, { name: '3v3', profiles: [make('3v3', 0)] }, { name: '4v4', profiles: [make('4v4', 1)] }, { name: 'multi', profiles: Array.from({ length: 7 }, (_, index) => make(index % 2 ? '4v4' : '3v3', index)) }];
  try {
    for (const entry of cases) {
      const current = entry.profiles[0], templateId = current ? recommendLineup(current).recommendations[0].templateId : 'pick-roll';
      const playbackContext = current ? { profileId: current.id, profileRevision: current.revision, templateId } : null;
      const archive = JSON.stringify({ schemaVersion: 1, profiles: entry.profiles, activeProfileId: current?.id || null, playbackContext }), selection = JSON.stringify({ templateId, frameIndex: 1 });
      await replaceDocument(archive, selection); await nav('archives'); const original = await snapshot();
      for (const [width, height] of [[360,400],[390,844],[360,640],[844,390],[1024,768],[835,340]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await wait(100);
        while (await evaluate("Boolean(document.querySelector('[data-action=lineup-archives-prev]:not(:disabled)'))")) await click('[data-action=lineup-archives-prev]');
        const seen = [], pages = Math.max(1, Math.ceil(entry.profiles.length / 3));
        for (let page = 0; page < pages; page++) {
          const geometry = await evaluate(`(()=>{const p=document.querySelector('.lineup-archives-card'),r=p.getBoundingClientRect(),nav=document.querySelector('.view-nav').getBoundingClientRect(),cards=[...p.querySelectorAll('.lineup-archive-card')];return{state:${JSON.stringify(entry.name)},width:innerWidth,height:innerHeight,page:${page},title:p.querySelector('h1').textContent,nav:[...document.querySelectorAll('[data-view-target]')].map(n=>({id:n.dataset.viewTarget,label:n.textContent.trim()})),ids:cards.map(n=>n.dataset.profileId),names:cards.map(n=>n.querySelector('h2').textContent),current:cards.filter(n=>n.dataset.current==='true').map(n=>n.dataset.profileId),text:p.textContent,box:r.toJSON(),aboveNav:r.bottom<=nav.top+1,overflow:document.documentElement.scrollWidth>innerWidth+2||document.documentElement.scrollHeight>innerHeight+2,forms:p.querySelectorAll('input,form,textarea').length,controls:[...p.querySelectorAll('button')].filter(n=>!n.disabled&&(${visible})(n)).map(n=>{const b=n.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{action:n.dataset.action,fit:b.width>0&&b.height>0&&b.x>=-1&&b.y>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1,hit:h===n||n.contains(h)}})}})()`);
          assert.equal(geometry.title, '我的'); assert.match(geometry.text, /我的球队/); assert.deepEqual(geometry.nav.map(n=>n.label), ['更衣室','训练场','战术库','我的']); assert.equal(geometry.nav.at(-1).id, 'archives');
          assert.equal(geometry.overflow, false); assert.equal(geometry.aboveNav, true); assert.equal(geometry.forms, 0); assert.ok(geometry.controls.every(n => n.fit && n.hit), `${entry.name}/${width}x${height}: all personal-page controls are actionable`);
          assert.deepEqual(geometry.names, entry.profiles.slice(page * 3, page * 3 + 3).map(p => p.name), 'my teams show actual saved names rather than demo cards');
          assert.deepEqual(geometry.current, page === 0 && current ? [current.id] : [], 'current-use marker corresponds to the real saved selection');
          assert.equal(geometry.ids.length, Math.min(3, Math.max(0, entry.profiles.length - page * 3))); seen.push(...geometry.ids); layouts.push(geometry);
          if (page < pages - 1) await click('[data-action=lineup-archives-next]');
        }
        assert.deepEqual(seen, entry.profiles.map(p => p.id)); assert.deepEqual(await snapshot(), original, 'browsing personal-page cards preserves raw data and the actual recommendation source');
        while (await evaluate("Boolean(document.querySelector('[data-action=lineup-archives-prev]:not(:disabled)'))")) await click('[data-action=lineup-archives-prev]');
        if (entry.name === 'multi' || width === 390) {
          const label = `${entry.name}-${width}-${height}`;
          await explain('account', width === 360 ? 'escape' : 'local', { label });
          if (entry.name === 'multi') await explain('backup', width === 844 ? 'cancel' : 'close', { label });
        }
        if (width === 390 || width === 360 && height === 400) await shot(`hc046-${entry.name}-${width}-${height}-my.png`);
      }
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(100);
    await explain('settings', 'shade', { label: 'tools' }); await explain('about', 'cancel', { label: 'tools' });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await explain('account', 'local', { reduced: true, label: 'reduced' }); await send('Emulation.setEmulatedMedia', { features: [] });

    const before = await snapshot(), managed = cases.at(-1).profiles[1];
    await findArchiveCard(context, managed.id); await click(`[data-action=lineup-archive-menu][data-profile-id="${managed.id}"]`); await waitFor("document.querySelector('#lineup-archive-menu').open");
    await click('#lineup-archive-menu [data-action=lineup-delete]'); await click('#lineup-archive-menu [data-action=lineup-delete-cancel]'); await keyEvent('Escape'); await waitFor("!document.querySelector('#lineup-archive-menu').open"); assert.deepEqual(await snapshot(), before, 'my-page delete cancel does not switch or delete a noncurrent team');
    await click(`[data-action=lineup-archive-menu][data-profile-id="${managed.id}"]`); await click('#lineup-archive-menu [data-action=lineup-archive-rename]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
    await evaluate("(()=>{const n=document.querySelector('[data-action=lineup-team-name]');n.value='我的页保留的配置草稿';n.dispatchEvent(new Event('input',{bubbles:true}))})()"); await action('lineup-wizard-close'); await action('lineup-draft-keep'); await waitFor("!document.querySelector('#lineup-wizard-dialog').open");
    await explain('about', 'local', { label: 'kept-draft' }); await nav('play'); await nav('archives');
    await click(`[data-action=lineup-archive-menu][data-profile-id="${managed.id}"]`); await click('#lineup-archive-menu [data-action=lineup-archive-rename]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'"); assert.equal(await evaluate("document.querySelector('[data-action=lineup-team-name]').value"), '我的页保留的配置草稿'); await action('lineup-wizard-close'); await action('lineup-draft-discard'); await waitFor("!document.querySelector('#lineup-wizard-dialog').open"); assert.deepEqual(await snapshot(), before, 'information panels and navigation preserve in-memory drafts without saving them');
    await click('[data-action=lineup-create]'); await waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'"); assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet:not(.lineup-account-sheet)').dataset.step"), '1'); await action('lineup-wizard-close'); if (await evaluate("Boolean(document.querySelector('[data-action=lineup-draft-discard]'))")) await action('lineup-draft-discard'); await waitFor("!document.querySelector('#lineup-wizard-dialog').open"); assert.deepEqual(await snapshot(), before, 'my-page create entry still opens the real draft wizard and cancel never saves');

    await findArchiveCard(context, managed.id);
    await evaluate(`(()=>{window.__hc046FaultSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${key}')throw Error('HC046 selection denied');return window.__hc046FaultSetItem.call(this,k,v)}})()`);
    await click(`[data-action=lineup-select][data-profile-id="${managed.id}"]`); await waitFor("document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&document.querySelector('#lineups-panel').textContent.includes('HC046 selection denied')"); assert.equal(await evaluate('document.body.dataset.view'), 'archives'); assert.deepEqual(await snapshot(), before, 'failed real team selection preserves old team, source, play and both raw files');
    await evaluate('Storage.prototype.setItem=window.__hc046FaultSetItem;delete window.__hc046FaultSetItem'); await explain('account', 'local', { label: 'selection-failed' });
    await click(`[data-action=lineup-select][data-profile-id="${managed.id}"]`); await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition"); assert.equal(await evaluate("document.querySelector('.locker-scene').dataset.profileId"), managed.id); const selected = await evaluate(`JSON.parse(localStorage.getItem('${key}'))`); assert.equal(selected.activeProfileId, managed.id); assert.equal(selected.playbackContext, null); assert.equal(await evaluate('document.body.dataset.lineupContext'), ''); assert.equal(await evaluate(`localStorage.getItem('${selectionKey}')`), before.selection);
    await writeFile(path.join(folder, 'hc046-account-center.json'), JSON.stringify({ layouts, dialogs, motions, localOnly: true, unchangedInformationStorage: true, realSelectionFailureAndRetry: true, keptDraftAndCancel: true, nativeDialogCancelCovered: true, nativeBridgeBackNotSimulated: true }, null, 2));
  } finally {
    await evaluate('(()=>{window.__hc046RestoreAudit?.();if(window.__hc046FaultSetItem)Storage.prototype.setItem=window.__hc046FaultSetItem;delete window.__hc046FaultSetItem})()');
    await replaceDocument(backup.archive, backup.selection);
    assert.deepEqual(await evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}')})`), backup, 'final restoration survives the real outgoing pagehide save');
  }
}
