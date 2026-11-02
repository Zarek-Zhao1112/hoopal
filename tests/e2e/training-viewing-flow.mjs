import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { offenseRules } from '../../data/recommendations/offense.js';

/** Exercise the real training board in the runner's disposable browser profile. */
export async function runTrainingViewingFlow({ send, evaluate, wait, waitFor, folder }) {
  const archiveKey = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1';
  const sizes = [[390, 844], [360, 640], [360, 400], [844, 390], [1024, 768], [835, 340]];
  const backup = await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`);
  const layouts = [], actions = [], natural = [];
  const settled = () => waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')&&!document.querySelector('dialog[open]')");
  const click = async selector => {
    const point = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)});return{x,y}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
  };
  const key = async name => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name });
  };
  const nav = async view => { await click(`[data-view-target=${view}]`); await waitFor(`document.body.dataset.view==='${view}'&&!document.body.dataset.pageTransition`); };
  const pause = async () => { if (await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'")) await click('#play-toggle'); };
  const facts = () => evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}'),template:document.querySelector('#template-picker').value,source:document.body.dataset.lineupContext,progress:document.querySelector('#timeline-scrub').value,counter:document.querySelector('#frame-counter').textContent,players:document.querySelector('#players-layer').innerHTML})`);
  const shot = async name => { const result = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, name), Buffer.from(result.data, 'base64')); };
  async function documentWith(archive, selection) {
    await pause();
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    // Incoming-document injection avoids the outgoing pagehide persisting over
    // the fixture. This never reads or writes a real phone's files.
    const script = await send('Page.addScriptToEvaluateOnNewDocument', { source: `${archive === null ? `localStorage.removeItem('${archiveKey}')` : `localStorage.setItem('${archiveKey}',${JSON.stringify(archive)})`};${selection === null ? `localStorage.removeItem('${selectionKey}')` : `localStorage.setItem('${selectionKey}',${JSON.stringify(selection)})`};window.__hc048Ready=true;` });
    try { await evaluate('window.__hc048Ready=false'); await send('Page.reload'); await waitFor("window.__hc048Ready===true&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&Boolean(document.querySelector('#players-layer [data-player]'))"); }
    finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier }); await send('Emulation.setEmulatedMedia', { features: [] }); }
  }
  function profileFor(templateId) {
    const template = templates.find(t => t.id === templateId), rule = offenseRules.find(r => r.templateId === templateId);
    const profile = createLineup(template.mode, { id: `hc048-${templateId}`, name: `完整动画${template.mode}球队`, nbaTeamId: 'BOS' });
    profile.recentTemplateId = templateId;
    profile.players.forEach((member, index) => Object.assign(member, { id: `hc048-member-${index}`, name: ['小王', '大李', '阿杰', '小陈'][index], number: [7, 12, 23, 30][index], height: 'medium', build: 'medium', mobility: 'agile', strengths: Object.entries(rule.roles[index].weights).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill]) => skill), weaknesses: [] }));
    validateLineup(profile);
    assert.ok(recommendLineup(profile).recommendations.some(r => r.templateId === templateId), 'source fixture is a genuine production recommendation');
    return profile;
  }
  const cases = [
    { id: 'post-split' }, { id: 'screen-the-screener' },
    { id: 'defense-3v3-man-to-man' }, { id: 'defense-4v4-man-to-man' },
    { id: 'post-split', profile: profileFor('post-split') },
    { id: 'screen-the-screener', profile: profileFor('screen-the-screener') },
  ];
  try {
    for (const entry of cases) {
      const template = templates.find(t => t.id === entry.id), play = template.build(), profile = entry.profile;
      const playbackContext = profile ? { profileId: profile.id, profileRevision: profile.revision, templateId: template.id } : null;
      await documentWith(JSON.stringify({ schemaVersion: 1, profiles: profile ? [profile] : [], activeProfileId: profile?.id || null, playbackContext }), JSON.stringify({ templateId: template.id, frameIndex: 1 }));
      await nav('play'); const original = await facts();
      assert.equal(original.counter, `2 / ${play.frames.length}`, 'saved nonzero progress restores into the new controls');
      assert.equal(original.source, profile?.id || '');
      for (const [width, height] of sizes) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await wait(100); await settled();
        const geometry = await layout(entry, width, height);
        layouts.push(geometry);
        await click(`#frame-list [data-frame-index="${play.frames.length - 1}"]`);
        await waitFor(`document.querySelector('#frame-counter').textContent==='${play.frames.length} / ${play.frames.length}'`);
        const actual = await evaluate("Object.fromEntries([...document.querySelectorAll('#players-layer [data-player]')].map(n=>{const m=n.transform.baseVal.consolidate().matrix;return[n.dataset.player,[m.e,m.f]]}))");
        for (const player of play.frames.at(-1).players) assert.ok(actual[player.id] && Math.hypot(actual[player.id][0] - player.x, actual[player.id][1] - player.y) < .001, `${template.id}: pointer chooses the real last frame, including steps seven/eight`);
        await click('#frame-list [data-frame-index="1"]');
        await waitFor(`document.querySelector('#frame-counter').textContent==='2 / ${play.frames.length}'`);
        assert.deepEqual(await facts(), original, 'resizing and returning to the same real step preserve raw archives, selection and source');
        if (width === 390 || width === 844 || width === 360 && height === 400 || width === 1024 && profile) await shot(`hc048-${profile ? 'recommended' : 'plain'}-${template.id}-${width}x${height}.png`);
        if (profile) await checkLegend(profile, template.id);
      }
      await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(80);
      await exerciseControls(template, original);
    }
    await checkNaturalPlayback();
    await writeFile(path.join(folder, 'hc048-training-viewing.json'), JSON.stringify({ layouts, actions, natural, rawArchiveProtected: true, note: 'Desktop Chrome real DOM/SVG and pointer/keyboard input; not physical touch, native Back, or frame-rate measurement.' }, null, 2) + '\n');
  } finally {
    await evaluate('window.__hc048StopSampling?.()');
    await documentWith(backup.archive, backup.selection);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await nav('lineups');
  }

  async function layout(entry, width, height) {
    const template = templates.find(t => t.id === entry.id), count = template.build().frames.length;
    const result = await evaluate(`(()=>{const card=document.querySelector('.training-panel'),court=document.querySelector('#court'),stage=document.querySelector('.court-stage'),r=card.getBoundingClientRect(),s=stage.getBoundingClientRect(),m=court.getScreenCTM(),nav=document.querySelector('.view-nav').getBoundingClientRect();const visible=n=>n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';return{case:${JSON.stringify(entry.profile ? `recommended-${entry.id}` : entry.id)},width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,card:r.toJSON(),nav:nav.toJSON(),stage:s.toJSON(),courtMatrix:{a:m.a,b:m.b,c:m.c,d:m.d,e:m.e,f:m.f},viewBox:[court.viewBox.baseVal.width,court.viewBox.baseVal.height],title:document.querySelector('#training-title').textContent,selectedTitle:document.querySelector('#template-picker').selectedOptions[0]?.textContent,kind:document.body.dataset.tacticKind,mode:document.querySelector('#mode').value,counter:document.querySelector('#frame-counter').textContent,markers:[...document.querySelectorAll('#frame-list button')].map(n=>({index:Number(n.dataset.frameIndex),current:n.getAttribute('aria-current'),name:n.getAttribute('aria-label')||n.title||n.textContent})),legendVisible:!document.querySelector('#lineup-legend').hidden,controls:[...card.querySelectorAll('button,select,input[type=range],label.toggle-label,label.loop-label')].filter(visible).map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id:n.id||n.dataset.frameIndex||n.className,disabled:n.disabled,rect:r.toJSON(),fit:r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&r.x>=card.getBoundingClientRect().x-1&&r.right<=card.getBoundingClientRect().right+1&&r.bottom<=card.getBoundingClientRect().bottom+1,hit:h===n||n.contains(h)}})}})()`);
    const label = `${result.case}/${width}x${height}`;
    assert.ok(result.sw <= width + 1 && result.sh <= height + 1, `${label}: no whole-page scrolling`);
    assert.ok(result.card.top >= (height <= 400 ? 50 : 85) && result.card.bottom <= result.nav.top + 1, `${label}: top breathing room and bottom navigation remain clear`);
    assert.equal(result.title, template.title, `${label}: actual tactic is the visible heading`);
    assert.ok(result.selectedTitle.includes(template.title)); assert.equal(result.mode, template.mode); assert.equal(result.kind, template.kind);
    assert.deepEqual(result.markers.map(n => n.index), Array.from({ length: count }, (_, i) => i));
    assert.equal(result.markers.filter(n => n.current === 'step').length, 1); assert.equal(result.markers.find(n => n.current === 'step').index, 1);
    assert.ok(result.markers.every(n => n.name.trim()), `${label}: step markers have understandable accessible names`);
    assert.equal(result.legendVisible, Boolean(entry.profile));
    for (const control of result.controls) assert.ok(control.fit && control.hit, `${label}: actionable control ${JSON.stringify(control)}`);
    const m = result.courtMatrix, [vbw, vbh] = result.viewBox;
    assert.ok(m.a > 0 && Math.abs(m.a - m.d) < .001 && Math.abs(m.b) < .001 && Math.abs(m.c) < .001, `${label}: SVG keeps uniform court scale`);
    assert.ok(m.e >= result.stage.left - 1 && m.f >= result.stage.top - 1 && m.e + vbw * m.a <= result.stage.right + 1 && m.f + vbh * m.d <= result.stage.bottom + 1, `${label}: the complete court is visible without cropping`);
    assert.ok(vbw * m.a >= 115 && vbh * m.d >= 90, `${label}: real court retains a useful viewing area`);
    return result;
  }

  async function checkLegend(profile, templateId) {
    const recommendation = recommendLineup(profile).recommendations.find(r => r.templateId === templateId), seen = [];
    while (await evaluate("!document.querySelector('#legend-prev').disabled")) await click('#legend-prev');
    for (let page = 0; page < Math.ceil(profile.players.length / 2); page++) {
      seen.push(...await evaluate("[...document.querySelectorAll('.legend-row')].map(n=>({role:Number(n.dataset.role),name:n.querySelector('.legend-name').textContent,task:n.querySelector('.legend-task').textContent}))"));
      if (page < Math.ceil(profile.players.length / 2) - 1) await click('#legend-next');
    }
    for (const assignment of recommendation.assignments) {
      const row = seen.find(n => n.role === assignment.role), member = profile.players.find(p => p.id === assignment.playerId);
      assert.ok(row?.name.includes(member.name) && row.name.includes(`球衣 ${member.number} 号`)); assert.equal(row.task, assignment.task);
      assert.ok(await evaluate(`document.querySelector('#players-layer [data-player="attack-${assignment.role}"] title').textContent.includes(${JSON.stringify(member.name)})`));
    }
    await click('.legend-row'); await waitFor("document.querySelector('#note-dialog').open");
    assert.ok(await evaluate("document.querySelector('#note-preview').textContent.includes('职责')")); await click('#close-note');
    while (await evaluate("!document.querySelector('#legend-prev').disabled")) await click('#legend-prev');
  }

  async function exerciseControls(template, original) {
    const count = template.build().frames.length;
    await click('#next-frame'); assert.equal(await evaluate("document.querySelector('#frame-counter').textContent"), `3 / ${count}`);
    await click('#prev-frame'); assert.equal(await evaluate("document.querySelector('#frame-counter').textContent"), `2 / ${count}`);
    // A real drag exercises the existing continuous input followed by change
    // snapping; it is deliberately not a direct value/event assignment.
    const slider = await evaluate("(()=>{const r=document.querySelector('#timeline-scrub').getBoundingClientRect();return{x:r.x+Math.min(12,r.width/5),y:r.y+r.height/2,end:r.x+r.width*.72}})()");
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: slider.x, y: slider.y, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: slider.end, y: slider.y, button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: slider.end, y: slider.y, button: 'left', buttons: 0 });
    const progress = Number(await evaluate("document.querySelector('#timeline-scrub').value")); assert.ok(progress >= 400 && progress <= 900, 'pointer drag seeks to a later real step');
    await click('#open-note'); await waitFor("document.querySelector('#note-dialog').open");
    const notes = [];
    for (;;) { notes.push(await evaluate("document.querySelector('#note-preview').textContent")); if (await evaluate("document.querySelector('#note-page-next').disabled")) break; await click('#note-page-next'); }
    const index = Number((await evaluate("document.querySelector('#frame-counter').textContent")).split('/')[0]) - 1;
    assert.equal(notes.join(''), template.build().frames[index].note, 'full explanation remains available from the compact action row');
    await click('#close-note');
    const before = await evaluate("document.querySelectorAll('#players-layer [data-player]').length");
    await click('.toggle-label'); assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"), before / 2);
    await click('.toggle-label'); assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"), before);
    await click('#restart-play'); await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'&&Number(document.querySelector('#timeline-scrub').value)>1");
    assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-label')"), '暂停战术');
    assert.equal(await evaluate("document.querySelector('#template-picker').disabled&&document.querySelector('#mode').disabled"), true, 'changing tactics or size is blocked while playing');
    await click('#play-toggle'); assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')"), 'false');
    const paused = await facts(); await wait(120); assert.deepEqual(await facts(), paused, 'pause has no continuing animation or delayed source writes');
    await click('#frame-list [data-frame-index="1"]');
    const final = await facts(); assert.equal(final.archive, original.archive); assert.equal(final.source, original.source); assert.equal(final.template, original.template);
    actions.push({ templateId: template.id, recommended: Boolean(original.source), dragProgress: progress, explanationPages: notes.length, realLastStep: count - 1, pausedLabel: await evaluate("document.querySelector('#play-toggle').getAttribute('aria-label')") });
  }

  async function checkNaturalPlayback() {
    await documentWith(JSON.stringify({ schemaVersion: 1, profiles: [], activeProfileId: null, playbackContext: null }), JSON.stringify({ templateId: 'pick-roll', frameIndex: 0 }));
    await nav('play');
    // Select uses actual pointer focus and keyboard navigation, matching a
    // standard native Android/browser selector rather than a fake speed toggle.
    await click('#speed'); await key('End'); await key('Enter');
    assert.equal(await evaluate("document.querySelector('#speed').value"), '2');
    if (!await evaluate("document.querySelector('#loop-play').checked")) await click('.loop-label');
    await evaluate(`(()=>{const samples=[];let id;window.__hc048Samples=samples;window.__hc048StopSampling=()=>{cancelAnimationFrame(id);delete window.__hc048StopSampling};const tick=t=>{samples.push({t,progress:Number(document.querySelector('#timeline-scrub').value),counter:document.querySelector('#frame-counter').textContent,current:document.querySelector('#frame-list [aria-current=step]')?.dataset.frameIndex,playing:document.querySelector('#play-toggle').getAttribute('aria-pressed'),positions:[...document.querySelectorAll('#players-layer [data-player]')].map(n=>n.getAttribute('transform')).join('|')});id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick)})()`);
    await click('#play-toggle');
    await waitFor("window.__hc048Samples.some((s,i,a)=>i>0&&a[i-1].progress>990&&s.progress<80&&s.playing==='true')");
    await click('#play-toggle'); await evaluate('window.__hc048StopSampling()');
    const samples = await evaluate('window.__hc048Samples');
    assert.ok(new Set(samples.map(s => s.positions)).size > 15, 'real SVG players move continuously during the whole tactic');
    assert.ok(samples.some(s => s.counter === '4 / 4') && samples.some(s => s.progress > 100 && s.progress < 900));
    assert.ok(samples.filter(s => s.playing === 'true').every(s => s.current === String(Number(s.counter.split('/')[0]) - 1)), 'active timeline marker follows natural animation steps');
    natural.push({ kind: 'natural-full-cycle-2x', samples });
    await click('.loop-label'); assert.equal(await evaluate("document.querySelector('#loop-play').checked"), false);
    await click('#frame-list [data-frame-index="2"]'); await click('#play-toggle');
    await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='false'&&document.querySelector('#frame-counter').textContent==='4 / 4'");
    assert.equal(await evaluate("document.querySelector('#timeline-scrub').value"), '1000', 'non-loop playback stops at the actual final frame');
    await click('.loop-label'); await click('#restart-play');
    await waitFor("Number(document.querySelector('#timeline-scrub').value)>10");
    await nav('library'); const left = await facts(); await wait(180); assert.deepEqual(await facts(), left, 'leaving training stops the main animation');
    assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')"), 'false');
    await nav('play'); assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')"), 'false', 'returning does not silently restart');
    const resized = await facts();
    for (const [width, height] of [[844, 390], [390, 844]]) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true }); await wait(100); assert.deepEqual(await facts(), resized, 'rotation preserves exact current board and progress'); }
    await click('#template-picker'); await key('End'); await key('Enter');
    const target = templates.filter(t => t.mode === '3v3' && t.kind === 'offense').at(-1);
    await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(target.id)}`);
    assert.equal(await evaluate("document.querySelector('#training-title').textContent"), target.title, 'the visible title picker selects a real built-in tactic');
    natural.push({ kind: 'loop-off-final-stop-leave-resize-title-selection', stoppedProgress: 1000, selectedTemplate: target.id });
  }
}
