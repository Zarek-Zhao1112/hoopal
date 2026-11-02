import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import {confirmedRoleArchive,explicitRoleAssignments} from './role-fixtures.mjs';

/** Actual app interaction in the runner's disposable Chrome profile. */
export async function runTacticPickerFlow({ send, evaluate, wait, waitFor, folder }) {
  const archiveKey = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1';
  const root = '#training-tactic-picker', trigger = '#training-picker-trigger';
  const sizes = [[390, 844], [360, 640], [360, 400], [844, 390], [1024, 768], [835, 340]];
  const entryViewport = await evaluate('({width:innerWidth,height:innerHeight})');
  const backup = await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`);
  const layouts = [], choices = [], motions = [], boundary = [];
  const phase = value => waitFor(`document.querySelector('${root}').dataset.phase==='${value}'`);
  const idle = () => waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')&&!document.querySelector('dialog[open]')");
  const pointer = async (x, y, type = 'click') => {
    if (type === 'wheel') { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: 170 }); return; }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  };
  const point = selector => evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)});return{x,y}})()`);
  const click = async selector => { const p = await point(selector); await pointer(p.x, p.y); };
  const key = async (name, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, modifiers });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, modifiers });
  };
  const facts = () => evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}'),view:document.body.dataset.view,source:document.body.dataset.lineupContext,template:document.querySelector('#template-picker').value,title:document.querySelector('#training-title').textContent,progress:document.querySelector('#timeline-scrub').value,counter:document.querySelector('#frame-counter').textContent,players:document.querySelector('#players-layer').innerHTML})`);
  const shot = async name => { const image = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, name), Buffer.from(image.data, 'base64')); };
  const backgroundSelector = '.view-nav button,#mode,#open-menu,#open-note,#play-toggle,#prev-frame,#next-frame,#timeline-scrub,#speed,#restart-play,#toggle-defense,#loop-play';
  const locks = () => evaluate(`[...document.querySelectorAll(${JSON.stringify(backgroundSelector)})].map(n=>({id:n.id||n.dataset.viewTarget,disabled:n.disabled}))`);
  const open = async () => { await click(trigger); await phase('open'); assert.equal(await evaluate(`document.querySelector('${trigger}').getAttribute('aria-expanded')`), 'true'); };
  const closeEscape = async () => { await key('Escape'); await phase('closed'); assert.equal(await evaluate('document.activeElement.id'), 'training-picker-trigger', 'closing restores the actual title trigger'); };
  async function scrollOption(id) {
    const selector = `${root} [data-picker-template="${id}"]`;
    await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)}),list=document.querySelector('${root} [data-picker-list]');if(!n||!list)throw Error('Missing real picker row/list');const r=n.getBoundingClientRect(),b=list.getBoundingClientRect();list.scrollTop+=r.top-b.top-(b.height-r.height)/2})()`);
    await wait(15);
    return selector;
  }
  async function choose(id, { double = false } = {}) {
    await open(); const p = await point(await scrollOption(id)); await pointer(p.x, p.y);
    let doubleClickEvidence = null;
    if (double) {
      await wait(15);
      doubleClickEvidence = await evaluate(`(()=>{const h=document.elementFromPoint(${p.x},${p.y});return{now:performance.now(),phase:document.querySelector('${root}').dataset.phase,point:${JSON.stringify(p)},hitDismiss:!!h?.closest('[data-picker-dismiss]'),hit:h?.tagName,className:h?.className}})()`);
      assert.equal(doubleClickEvidence.phase, 'closing', 'the second real pointer press occurs during the first selection close');
      assert.equal(doubleClickEvidence.hitDismiss, true, 'the fading panel releases that same row location to the transparent dismiss layer');
      await pointer(p.x, p.y);
    }
    await phase('closed'); await idle(); return { doubleClickEvidence };
  }
  function profileFor(templateId) {
    const template = templates.find(t => t.id === templateId);
    const profile = createLineup(template.mode, { id: `hc050-${templateId}`, name: `玻璃选单${template.mode}球队`, nbaTeamId: 'BOS' });
    profile.players.forEach((member, i) => Object.assign(member, { name: ['小王', '大李', '阿杰', '小陈'][i], number: [7, 12, 23, 30][i] }));
    validateLineup(profile);
    return profile;
  }
  async function documentWith(archive, selection) {
    await evaluate("window.__hc050RestoreAudit?.();if(window.__hc050FaultOriginal)Storage.prototype.setItem=window.__hc050FaultOriginal;delete window.__hc050FaultOriginal;(()=>{const b=document.querySelector('#play-toggle');if(b?.getAttribute('aria-pressed')==='true')b.click()})()");
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const injected = await send('Page.addScriptToEvaluateOnNewDocument', { source: `${archive === null ? `localStorage.removeItem('${archiveKey}')` : `localStorage.setItem('${archiveKey}',${JSON.stringify(archive)})`};${selection === null ? `localStorage.removeItem('${selectionKey}')` : `localStorage.setItem('${selectionKey}',${JSON.stringify(selection)})`};window.__hc050Ready=true;` });
    try { await evaluate('window.__hc050Ready=false'); await send('Page.reload'); await waitFor("window.__hc050Ready===true&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&Boolean(document.querySelector('#players-layer [data-player]'))"); }
    finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier }); await send('Emulation.setEmulatedMedia', { features: [] }); }
  }
  async function enter(entry) {
    const profile = entry.profile;
    await documentWith(JSON.stringify(confirmedRoleArchive(profile?[profile]:[],profile?.id||null,entry.id)), JSON.stringify({ templateId: entry.id, frameIndex: 1 }));
    await click('[data-view-target=play]'); await idle();
    await evaluate(`(()=>{window.__hc050Writes=[];window.__hc050SelectChanges=0;window.__hc050LoadStarts=0;const observer=new MutationObserver(records=>{for(const r of records)if(!String(r.oldValue).split(/\\s+/).includes('is-loading')&&document.body.classList.contains('is-loading'))window.__hc050LoadStarts++});observer.observe(document.body,{attributes:true,attributeOldValue:true,attributeFilter:['class']});const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(['${archiveKey}','${selectionKey}'].includes(k))window.__hc050Writes.push({key:k,value:v});return original.call(this,k,v)};window.__hc050RestoreAudit=()=>{Storage.prototype.setItem=original;observer.disconnect();delete window.__hc050RestoreAudit};document.querySelector('#template-picker').addEventListener('change',()=>window.__hc050SelectChanges++)})()`);
    assert.equal(await evaluate("document.querySelector('#template-picker').hidden&&document.querySelector('#template-picker').getClientRects().length===0"), true, 'legacy select preserves the data interface without remaining a second visible control');
    assert.equal(await evaluate("document.querySelector('#frame-counter').textContent.split('/')[0].trim()"), '2', 'nonzero saved step restores before picker interactions');
  }
  const cases = [{ id: 'post-split' }, { id: 'screen-the-screener' }, { id: 'defense-3v3-man-to-man' }, { id: 'defense-4v4-man-to-man' }, { id: 'post-split', profile: profileFor('post-split') }, { id: 'screen-the-screener', profile: profileFor('screen-the-screener') }];
  try {
    for (const entry of cases) {
      const template = templates.find(t => t.id === entry.id), catalog = templates.filter(t => t.mode === template.mode && t.kind === template.kind);
      await enter(entry); const original = await facts();
      assert.equal(original.source, '', 'retired source remains on disk, while current practice uses numbered players');
      for (const [width, height] of sizes) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await wait(70); await idle();
        const before = await evaluate(`({card:document.querySelector('.training-panel').getBoundingClientRect().toJSON(),nav:document.querySelector('.view-nav').getBoundingClientRect().toJSON(),locks:[...document.querySelectorAll(${JSON.stringify(backgroundSelector)})].map(n=>({id:n.id||n.dataset.viewTarget,disabled:n.disabled}))})`);
        await evaluate('window.__hc050Writes=[]');
        await open();
        const result = await geometry(entry, width, height);
        assert.deepEqual(result.card, before.card, 'opening the overlay does not reflow the actual training card');
        assert.deepEqual(result.nav, before.nav, 'the four-tab bar keeps its actual border box');
        assert.deepEqual(result.options.map(n => n.id), catalog.map(t => t.id), 'only the real current size/category appears, in production order');
        assert.deepEqual(result.options.filter(n => n.selected).map(n => n.id), [entry.id]);
        assert.ok(result.currentVisible, 'opening scrolls the current selected tactic into the local list viewport');
        assert.ok((await locks()).every(n => n.disabled), 'all background playback, mode and navigation controls stay locked while open');
        await evaluate("document.querySelector('[data-view-target=library]').click();document.querySelector('#open-note').click()");
        assert.equal(await evaluate('document.body.dataset.view'), 'play'); assert.equal(await evaluate("document.querySelector('#note-dialog').open"), false);
        if (height >= 640 && width < 600 && catalog.length === 9) assert.ok(result.list.scrollHeight <= result.list.height + 2, 'normal portrait displays all nine titles without list scrolling');
        const reachable = [];
        for (const item of catalog) {
          const selector = await scrollOption(item.id), p = await point(selector);
          const bounds = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(),list=document.querySelector('${root} [data-picker-list]').getBoundingClientRect();return{top:r.top,bottom:r.bottom,listTop:list.top,listBottom:list.bottom}})()`);
          assert.ok(bounds.top >= bounds.listTop - 1 && bounds.bottom <= bounds.listBottom + 1, 'each row can be fully reached by local scrolling');
          reachable.push({ id: item.id, point: p, ...bounds });
        }
        result.reachable = reachable; layouts.push(result);
        if ((entry.profile || entry.id === 'post-split') && [390, 844, 1024].includes(width) || entry.profile && width === 360 && height === 400) await shot(`hc050-${entry.profile ? 'recommended' : 'plain'}-${entry.id}-${width}x${height}-open.png`);
        await click(await scrollOption(entry.id)); await phase('closed');
        assert.deepEqual(await facts(), original, 'choosing the current tactic preserves nonzero progress, recommendation identity and exact raw files');
        assert.deepEqual(await evaluate('window.__hc050Writes'), [], 'opening and choosing the current item do not write storage');
        assert.equal(await evaluate('window.__hc050SelectChanges'), 0, 'opening/closing does not synthesize a legacy select change');
        assert.deepEqual(await locks(), before.locks, 'the exact original enabled/disabled background state returns');
      }
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(60);
      const target = catalog.find(t => t.id !== entry.id);
      if (entry.profile) {
        await evaluate(`window.__hc050FaultOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}'&&JSON.parse(v).playbackContext===null)throw Error('HC050 source clear failure');return window.__hc050FaultOriginal.call(this,k,v)}`);
        try { await choose(target.id); await waitFor("document.querySelector('#toast-live').textContent.includes('战术切换失败')"); assert.deepEqual(await facts(), original, 'failed source clear preserves the original nonzero step, board, picker title, raw files and actual team mapping'); assert.equal(await evaluate(`document.querySelector('${trigger}').disabled`), false, 'failed selection can be opened again for retry'); }
        finally { await evaluate('Storage.prototype.setItem=window.__hc050FaultOriginal;delete window.__hc050FaultOriginal'); }
      }
      await evaluate('window.__hc050LoadStarts=0');
      const choiceResult = await choose(target.id, { double: true }); await waitFor(`document.querySelector('#template-picker').value===${JSON.stringify(target.id)}`);
      await wait(200);
      assert.equal(await evaluate('window.__hc050LoadStarts'), 1, 'two actual pointer clicks at the same row location commit only the first selection once');
      assert.equal(await evaluate("document.querySelector('#training-title').textContent"), target.title);
      assert.equal(await evaluate('document.body.dataset.lineupContext'), '');
      assert.equal(await evaluate("document.querySelector('#frame-counter').textContent"), `1 / ${target.build().frames.length}`);
      const stored = JSON.parse(await evaluate(`localStorage.getItem('${archiveKey}')`));
      assert.equal(stored.playbackContext, null); assert.deepEqual(stored.profiles, entry.profile ? [entry.profile] : []);
      const actualPlayers = await evaluate("Object.fromEntries([...document.querySelectorAll('#players-layer [data-player]')].map(n=>{const m=n.transform.baseVal.consolidate().matrix;return[n.dataset.player,[m.e,m.f]]}))");
      for (const player of target.build().frames[0].players) assert.ok(Math.hypot(actualPlayers[player.id][0] - player.x, actualPlayers[player.id][1] - player.y) < .001, 'new selection loads the actual production frame');
      choices.push({ from: entry.id, to: target.id, recommended: Boolean(entry.profile), failureAndRetry: Boolean(entry.profile), realFirstFrame: true, realDoubleClickSingleLoad: true, doubleClickEvidence: choiceResult.doubleClickEvidence });
    }
    await writeFile(path.join(folder, 'hc050-picker-progress.json'), JSON.stringify({ layouts, choices, boundaryChecksPending: true, note: 'Raw completed sections only; this file is not an overall pass result.' }, null, 2) + '\n');
    await interactionBoundaries();
    await writeFile(path.join(folder, 'hc050-tactic-picker.json'), JSON.stringify({ entryViewport, layouts, choices, motions, boundary, nativeBridgeBackNotSimulated: true, scope: 'Actual app in isolated desktop Chrome with pointer, keyboard, wheel and real RAF observations. No real phone data, physical Android Back, touch/IME or FPS certification.' }, null, 2) + '\n');
  } finally {
    await evaluate('window.__hc050StopTrace?.()');
    await send('Emulation.setDeviceMetricsOverride', { ...entryViewport, deviceScaleFactor: 1, mobile: entryViewport.width < 600 });
    await documentWith(backup.archive, backup.selection);
    await click('[data-view-target=lineups]'); await idle();
    assert.deepEqual(await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`), backup, 'final restore survives outgoing pagehide persistence');
    const restoredViewport = await evaluate('({width:innerWidth,height:innerHeight})');
    assert.deepEqual(restoredViewport, entryViewport, 'the new first group restores the actual incoming viewport for every existing flow');
    assert.equal(await evaluate('document.body.dataset.view'), 'lineups');
    await writeFile(path.join(folder, 'hc050-picker-restoration.json'), JSON.stringify({ entryViewport, restoredViewport, rawArchiveAndSelectionUnchanged: true, view: 'lineups' }, null, 2) + '\n');
  }

  async function geometry(entry, width, height) {
    const result = await evaluate(`(()=>{const r=document.querySelector('${root}'),p=r.querySelector('[data-picker-panel]'),l=r.querySelector('[data-picker-list]'),t=document.querySelector('${trigger}'),b=p.getBoundingClientRect(),lr=l.getBoundingClientRect(),current=r.querySelector('[aria-selected=true]'),cr=current?.getBoundingClientRect(),s=getComputedStyle(p),nav=document.querySelector('.view-nav').getBoundingClientRect();return{case:${JSON.stringify((entry.profile ? 'recommended-' : '') + entry.id)},width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,phase:r.dataset.phase,card:document.querySelector('.training-panel').getBoundingClientRect().toJSON(),nav:nav.toJSON(),trigger:t.getBoundingClientRect().toJSON(),panel:b.toJSON(),list:{...lr.toJSON(),scrollHeight:l.scrollHeight,scrollTop:l.scrollTop},blur:s.backdropFilter||s.webkitBackdropFilter,workspaceFilter:getComputedStyle(document.querySelector('.workspace')).filter,expanded:t.getAttribute('aria-expanded'),controls:t.getAttribute('aria-controls'),options:[...r.querySelectorAll('[data-picker-template]')].map(n=>({id:n.dataset.pickerTemplate,selected:n.getAttribute('aria-selected')==='true',name:n.textContent.trim(),role:n.getAttribute('role')})),currentVisible:!!cr&&cr.top>=lr.top-1&&cr.bottom<=lr.bottom+1,focus:document.activeElement?.dataset.pickerTemplate||document.activeElement?.id}})()`);
    const label = `${result.case}/${width}x${height}`;
    assert.ok(result.sw <= width + 1 && result.sh <= height + 1, `${label}: the page itself never scrolls`);
    assert.ok(result.panel.width > 170 && result.panel.height > 80 && result.panel.left >= -1 && result.panel.right <= width + 1 && result.panel.top >= result.trigger.bottom - 1 && result.panel.bottom <= result.nav.top + 1, `${label}: anchored panel fits above navigation ${JSON.stringify(result.panel)}`);
    assert.ok(result.list.height > 35 && result.list.top >= result.panel.top && result.list.bottom <= result.panel.bottom + 1);
    assert.equal(result.expanded, 'true'); assert.equal(result.controls, 'training-tactic-picker');
    assert.ok(result.options.every(n => n.name && n.role === 'option'));
    assert.ok(/blur\(/.test(result.blur), `${label}: local glass blur exists`);
    assert.equal(result.workspaceFilter, 'none', `${label}: the whole training page is not blurred`);
    return result;
  }

  async function interactionBoundaries() {
    await enter({ id: 'post-split', profile: profileFor('post-split') });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(70);
    const original = await facts(), originalLocks = await locks(), titlePoint = await point(trigger);
    // Observe actual animation frames rather than replacing the product clock.
    await evaluate(`(()=>{window.__hc050Trace=[];window.__hc050PhaseChanges=[];const root=document.querySelector('${root}');let running=true,id;const observer=new MutationObserver(records=>{for(const r of records)window.__hc050PhaseChanges.push({now:performance.now(),attribute:r.attributeName,oldValue:r.oldValue,value:root.getAttribute(r.attributeName),phase:root.dataset.phase,visible:root.dataset.visible||null})});observer.observe(root,{attributes:true,attributeOldValue:true,attributeFilter:['data-phase','data-visible']});const tick=t=>{const r=document.querySelector('${root}'),p=r.querySelector('[data-picker-panel]'),s=getComputedStyle(p);window.__hc050Trace.push({t,now:performance.now(),phase:r.dataset.phase,visible:r.dataset.visible||null,opacity:Number(s.opacity),transform:s.transform,transition:s.transitionDuration,rect:p.getBoundingClientRect().toJSON(),expanded:document.querySelector('${trigger}').getAttribute('aria-expanded'),locked:[...document.querySelectorAll(${JSON.stringify(backgroundSelector)})].every(n=>n.disabled)});if(running)id=requestAnimationFrame(tick)};window.__hc050StopTrace=()=>{running=false;cancelAnimationFrame(id);observer.disconnect();delete window.__hc050StopTrace};id=requestAnimationFrame(tick)})()`);
    await open();
    // The phase timer can finish between browser frames. Wait for the actual
    // final open frame before initiating close, so the observation is complete.
    await waitFor("window.__hc050Trace.some(s=>s.phase==='open')");
    await pointer(4, 4); await phase('closed');
    await waitFor("window.__hc050Trace.some((s,i,a)=>s.phase==='closed'&&a.slice(0,i).some(v=>v.phase==='closing'))");
    await evaluate('window.__hc050StopTrace()');
    const samples = await evaluate('window.__hc050Trace'), phaseChanges = await evaluate('window.__hc050PhaseChanges');
    const opening = samples.filter(s => s.phase === 'opening'), closing = samples.filter(s => s.phase === 'closing');
    const opened = samples.find(s => s.phase === 'open'), closedAfter = samples.find((s, i) => s.phase === 'closed' && samples.slice(0, i).some(v => v.phase === 'closing'));
    const change = value => phaseChanges.find(s => s.attribute === 'data-phase' && s.value === value);
    const visibleAt = phaseChanges.find(s => s.attribute === 'data-visible' && s.value === 'true');
    const timing = { openingRafMs: opened && opening[0] ? opened.t - opening[0].t : null, closingRafMs: closedAfter && closing[0] ? closedAfter.t - closing[0].t : null, openingPhaseMs: change('open') && change('opening') ? change('open').now - change('opening').now : null, openingAfterVisibleMs: change('open') && visibleAt ? change('open').now - visibleAt.now : null, closingPhaseMs: change('closed') && change('closing') ? change('closed').now - change('closing').now : null };
    // Persist raw observations before assertions, including on any future failure.
    await writeFile(path.join(folder, 'hc050-picker-motion.json'), JSON.stringify({ samples, phaseChanges, timing, requiredOpeningMs: 220, requiredClosingMs: 160, note: 'Natural RAF and MutationObserver observations; no product clocks or durations were replaced.' }, null, 2) + '\n');
    assert.ok(opening.length > 2 && closing.length > 2, 'both opening and closing have observable real intermediate frames');
    assert.ok(opening.some(s => s.opacity > 0 && s.opacity < 1) && closing.some(s => s.opacity > 0 && s.opacity < 1), 'the 220/160 animation actually fades through intermediate opacity');
    assert.ok(samples.filter(s => ['opening', 'open', 'closing'].includes(s.phase)).every(s => s.locked), 'background remains locked through the entire visible animation, including closing');
    assert.ok(opened && opened.t - opening[0].t >= 170, 'opening has the approved deliberate timing');
    assert.ok(closedAfter && closedAfter.t - closing[0].t >= 110, 'closing does not unlock ahead of its animation');
    assert.ok(opening.some(s => s.transition.split(',').some(v => Math.abs(parseFloat(v) - .22) < .001)), 'the natural opening uses the approved 220ms CSS transition');
    assert.ok(closing.some(s => s.transition.split(',').some(v => Math.abs(parseFloat(v) - .16) < .001)), 'the natural closing uses the approved 160ms CSS transition');
    motions.push({ kind: 'normal-220-160', samples, phaseChanges, timing });
    assert.deepEqual(await facts(), original); assert.deepEqual(await locks(), originalLocks);
    assert.equal(await evaluate('document.activeElement.id'), 'training-picker-trigger');

    await open(); await pointer(titlePoint.x, titlePoint.y); await phase('closed');
    assert.deepEqual(await facts(), original, 'the actual original-title location closes without selecting or navigating');
    await open(); await key('Home');
    const ids = templates.filter(t => t.mode === '3v3' && t.kind === 'offense').map(t => t.id);
    assert.equal(await evaluate('document.activeElement.dataset.pickerTemplate'), ids[0]);
    await key('ArrowDown'); assert.equal(await evaluate('document.activeElement.dataset.pickerTemplate'), ids[1]);
    await key('End'); assert.equal(await evaluate('document.activeElement.dataset.pickerTemplate'), ids.at(-1));
    await key('Tab'); assert.equal(await evaluate('document.activeElement.dataset.pickerTemplate'), ids[0]);
    await key('Tab', 8); assert.equal(await evaluate('document.activeElement.dataset.pickerTemplate'), ids.at(-1));
    assert.equal(await evaluate(`${root.startsWith('#') ? `document.querySelector('${root} [aria-selected=true]')` : 'null'}.dataset.pickerTemplate`), 'post-split', 'keyboard focus is distinct from the actual selected tactic');
    await closeEscape(); assert.deepEqual(await facts(), original);

    // Rapidly closing an opening picker must not leave an old RAF/timer able to reopen it.
    await click(trigger); await wait(25); await pointer(titlePoint.x, titlePoint.y); await wait(15); await pointer(titlePoint.x, titlePoint.y); await phase('closed'); await wait(270);
    assert.equal(await evaluate(`document.querySelector('${root}').dataset.phase`), 'closed');
    assert.deepEqual(await facts(), original); await open(); await closeEscape();
    boundary.push({ kind: 'title-outside-keyboard-rapid-cancel', preserved: true });

    await open();
    await send('Emulation.setDeviceMetricsOverride', { width: 835, height: 340, deviceScaleFactor: 1, mobile: true }); await wait(90);
    await geometry({ id: 'post-split', profile: true }, 835, 340);
    assert.deepEqual(await facts(), original, 'resizing an open picker preserves nonzero progress and real recommendation identity');
    const listPoint = await evaluate(`(()=>{const l=document.querySelector('${root} [data-picker-list]');l.scrollTop=0;const r=l.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,scrollTop:l.scrollTop}})()`);
    await pointer(listPoint.x, listPoint.y, 'wheel'); await wait(90);
    assert.ok(await evaluate(`document.querySelector('${root} [data-picker-list]').scrollTop>0`), 'real wheel input scrolls the small local list');
    assert.ok(await evaluate('document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1'), 'local scrolling never moves the training page');
    await closeEscape(); assert.deepEqual(await facts(), original);
    boundary.push({ kind: 'open-resize-real-wheel', preserved: true });

    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await open();
    const reduced = await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('${root} [data-picker-panel]'));return{transition:s.transitionDuration,animation:s.animationDuration}})()`);
    assert.ok(reduced.transition.split(',').every(v => parseFloat(v) === 0) && reduced.animation.split(',').every(v => parseFloat(v) === 0), 'reduced motion removes both CSS transition and animation');
    await closeEscape(); assert.deepEqual(await facts(), original);
    motions.push({ kind: 'reduced-immediate', ...reduced });
    await send('Emulation.setEmulatedMedia', { features: [] });
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(70);
    await open(); const other = ids.find(id => id !== 'post-split');
    await click(await scrollOption(other));
    await evaluate("window.dispatchEvent(new Event('pagehide'))");
    await phase('closed'); await wait(300);
    assert.deepEqual(await facts(), original, 'backgrounding during the close animation cancels the pending selection instead of switching later');
    boundary.push({ kind: 'pending-choice-background-cancel', preserved: true });
    await evaluate('window.__hc050Writes=[]'); await open(); await closeEscape(); assert.deepEqual(await evaluate('window.__hc050Writes'), []);
    await click('#play-toggle'); await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'");
    assert.equal(await evaluate(`document.querySelector('${trigger}').disabled`), true);
    await evaluate(`document.querySelector('${trigger}').click()`);
    assert.equal(await evaluate(`document.querySelector('${root}').dataset.phase`), 'closed', 'playing does not open a tactic selector or interrupt the animation');
    await click('#play-toggle');
    boundary.push({ kind: 'playing-selector-disabled', preserved: true });
  }
}
