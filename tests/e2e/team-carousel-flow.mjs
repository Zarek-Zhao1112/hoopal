import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import {navigateLineupView} from './archive-helpers.mjs';
import { NBA_TEAMS } from '../../data/nba-teams.js';
import { createLineup } from '../../shared/lineups.js';
import {waitForWizardMotion} from './wizard-helpers.mjs';

/** Real component and draft integration, using the shared runner's Chrome. */
export async function runTeamCarouselFlow({ send, evaluate, wait, waitFor, folder }) {
  const key = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1';
  const saved = await evaluate(`localStorage.getItem('${key}')`), savedSelection = await evaluate(`localStorage.getItem('${selectionKey}')`);
  const action = async (name, extra = '') => {await evaluate(`(()=>{const n=document.querySelector('[data-action="${name}"]${extra}');if(!n||n.disabled)throw Error('Missing/disabled ${name}');n.click();})()`);await waitForWizardMotion({waitFor})};
  const input = (name, value) => evaluate(`(()=>{const n=document.querySelector('[data-action="${name}"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const state = () => evaluate("(()=>{const c=document.querySelector('.lineup-team-carousel'),s=c?.querySelector('.carousel-stage');return{teamId:c?.dataset.teamId??null,activeIndex:Number(s?.dataset.activeIndex),settled:c?.dataset.settled,allOpen:c?.dataset.allOpen,jerseyTeam:document.querySelector('.lineup-wizard-kit .lineup-jersey')?.dataset.teamId??null,phase:document.querySelector('#lineup-wizard-dialog').dataset.phase}})()");
  const settled = () => waitFor("document.querySelector('.lineup-team-carousel')?.dataset.settled==='true'");
  const modalStable = () => waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");
  const closed = () => waitFor("!document.querySelector('#lineup-wizard-dialog').open");
  const reload = async () => { await send('Page.reload'); await waitFor("Boolean(document.querySelector('[data-action=lineup-open-archives],[data-action=lineup-configure]'))"); };
  const screenshot = async name => { const data = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(path.join(folder, name), Buffer.from(data.data, 'base64')); };
  const chooseTeam = async id => {
    await action('lineup-carousel-all-open');
    while (await evaluate("!document.querySelector('[data-action=lineup-team-page-prev]').disabled")) await action('lineup-team-page-prev');
    for (let page = 0; page < 3; page++) {
      if (await evaluate(`Boolean(document.querySelector('.all-teams-panel [data-action=lineup-team-option][data-team-id="${id}"]'))`)) break;
      await action('lineup-team-page-next');
    }
    await action('lineup-team-option', `[data-team-id="${id}"]`); await settled();
    const selected = await state(); assert.equal(selected.teamId, id); assert.equal(selected.jerseyTeam, id); assert.equal(selected.allOpen, 'false');
  };
  const gesture = async (dx, dy = 0, { steps = 8, delay = 60, cancel = false } = {}) => {
    const origin = await evaluate("(()=>{const r=document.querySelector('.carousel-stage').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: origin.x + dx * i / steps, y: origin.y + dy * i / steps }] }); await wait(delay);
    }
    await send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); await settled();
  };
  const keyPress = async (key, code = key, vk = key === 'Escape' ? 27 : 9) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  };
  const geometry = async label => {
    await waitFor("[...document.querySelectorAll('#lineup-wizard-dialog img')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]')).every(n=>n.complete&&n.naturalWidth>0)");
    const facts = await evaluate(`(()=>{const d=document.querySelector('#lineup-wizard-dialog'),all=d.querySelector('.all-teams-panel:not([hidden])'),scope=all||d;
      const stage=d.querySelector('.carousel-stage'),r=stage?.getBoundingClientRect();
      const center=stage?.querySelector('.carousel-team[data-offset="0"]'),logo=center&&[...center.children].find(n=>!n.hidden),lr=logo?.getBoundingClientRect();
      return{width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,
       panelOverflow:d.querySelector('.lineup-sheet-content').scrollHeight-d.querySelector('.lineup-sheet-content').clientHeight,
       images:[...scope.querySelectorAll('img')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]')&&(!n.complete||!n.naturalWidth)).map(n=>n.src),
       logo:!all&&lr?{x:lr.x,y:lr.y,w:lr.width,h:lr.height,sx:r.x,sy:r.y,sw:r.width,sh:r.height}:null,
       controls:[...scope.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&!n.closest('[hidden]')&&n.getClientRects().length&&!(n.classList.contains('carousel-team')&&n.dataset.offset!=='0')).map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:n.dataset.action,x:r.x,y:r.y,w:r.width,h:r.height,hit:hit===n||n.contains(hit)}})};})()`);
    assert.ok(facts.sw <= facts.width + 1 && facts.sh <= facts.height + 1, label + ' document overflow');
    assert.ok(facts.panelOverflow <= 2, label + ' task content overflow'); assert.deepEqual(facts.images, [], label + ' bundled logos');
    for (const c of facts.controls) assert.ok(c.x >= -1 && c.y >= -1 && c.x + c.w <= facts.width + 1 && c.y + c.h <= facts.height + 1 && c.hit, label + ' control ' + JSON.stringify(c));
    if (facts.logo) { const l = facts.logo; assert.ok(l.x >= l.sx - 1 && l.y >= l.sy - 1 && l.x + l.w <= l.sx + l.sw + 1 && l.y + l.h <= l.sy + l.sh + 1, label + ' complete central logo'); }
    return facts;
  };
  const layouts = [], gestures = {};
  try {
    await evaluate(`localStorage.removeItem('${key}')`); await reload();
    await navigateLineupView({evaluate,waitFor},'archives');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    const diskBefore = await evaluate(`localStorage.getItem('${key}')`);
    await action('lineup-create-empty'); await modalStable(); await input('lineup-name', '转盘只读草稿'); await action('lineup-wizard-next'); await settled();
    assert.equal((await state()).teamId, '', 'new wizard starts neutral'); assert.equal((await state()).jerseyTeam, '');
    await action('lineup-wizard-next'); assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"), '2', 'new lineup still requires explicit NBA selection');
    for (const [width, height] of [[390, 844], [360, 640], [844, 390], [1024, 768]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await wait(90); await settled();
      assert.equal((await state()).teamId, '', 'resize must not silently choose a team');
      layouts.push({ width, height, main: await geometry(`neutral ${width}x${height}`) });
      await action('lineup-carousel-all-open'); layouts.at(-1).all = await geometry(`all ${width}x${height}`); await action('lineup-carousel-all-close');
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await wait(70);
    await gesture(-110, 0, { steps: 5, delay: 25, cancel: true }); assert.equal((await state()).teamId, '', 'cancel crossing a team rolls back to initial neutral'); assert.equal((await state()).jerseyTeam, '');
    await chooseTeam('GSW'); gestures.start = await state();
    await gesture(-110); gestures.left = await state(); assert.equal(gestures.left.activeIndex, (gestures.start.activeIndex + 1) % 30);
    await gesture(110); gestures.right = await state(); assert.equal(gestures.right.teamId, 'GSW');
    await gesture(0, 70); assert.equal((await state()).teamId, 'GSW', 'vertical drag never chooses a team');
    await gesture(-55, 0, { cancel: true }); assert.equal((await state()).teamId, 'GSW', 'cancel preserves origin selection');
    await gesture(-175, 0, { steps: 5, delay: 15 }); gestures.flick = await state();
    const forward = (gestures.flick.activeIndex - gestures.start.activeIndex + 30) % 30; assert.ok(forward >= 1 && forward <= 3, 'fast flick advances at most three teams');
    await chooseTeam('GSW'); await action('lineup-carousel-next'); await wait(70); assert.equal((await state()).settled, 'false');
    await gesture(100); gestures.interrupted = await state(); assert.equal(gestures.interrupted.teamId, gestures.interrupted.jerseyTeam);
    await chooseTeam(NBA_TEAMS.at(-1).id); await action('lineup-carousel-next'); await settled(); assert.equal((await state()).activeIndex, 0, 'last wraps to first');
    await action('lineup-carousel-prev'); await settled(); assert.equal((await state()).activeIndex, 29, 'first wraps to last');
    const idle = await state(); await wait(650); assert.deepEqual(await state(), idle, 'resting carousel never rotates automatically');
    await chooseTeam('GSW'); await action('lineup-carousel-next'); await wait(70); await action('lineup-inspect-team');
    assert.equal(await evaluate("document.querySelector('#note-dialog').open"), true, 'team description opens above the task sheet');
    await wait(450); await evaluate("document.querySelector('#close-note').click()");
    const afterDescription = await state(); await action('lineup-carousel-next'); await settled();
    assert.equal((await state()).activeIndex, (afterDescription.activeIndex + 1) % 30, 'closing full team description keeps carousel operable');
    assert.equal((await state()).teamId, (await state()).jerseyTeam);
    await chooseTeam('GSW'); const side = await evaluate("document.querySelector('.carousel-team[data-offset=\"1\"]').dataset.teamId"); await action('lineup-carousel-team', '[data-offset="1"]'); await settled(); assert.equal((await state()).teamId, side);
    await action('lineup-carousel-all-open');
    assert.ok(await evaluate("[...document.querySelectorAll('.lineup-sheet-heading button,.lineup-wizard-progress button,.lineup-wizard-actions button')].every(n=>n.disabled)"), 'all-teams list isolates external tasks');
    for (let i = 0; i < 20; i++) { await keyPress('Tab'); assert.ok(await evaluate("Boolean(document.activeElement.closest('.all-teams-panel'))"), 'Tab stays in all-team list'); }
    await keyPress('Escape'); assert.equal((await state()).allOpen, 'false'); assert.equal(await evaluate('document.activeElement.dataset.action'), 'lineup-carousel-all-open');
    assert.ok(!await evaluate("Boolean(document.querySelector('[data-action=lineup-draft-continue]'))"), 'first Escape closes only the all-team list');
    for (const team of NBA_TEAMS) await chooseTeam(team.id);
    assert.equal(await evaluate(`localStorage.getItem('${key}')`), diskBefore, 'all thirty selections remain only in the draft');
    for (const [width, height] of [[390, 844], [360, 640], [844, 390], [1024, 768]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 }); await chooseTeam('GSW'); await wait(80);
      layouts.push({ width, height, selected: await geometry(`GSW ${width}x${height}`) }); await screenshot(`hc025-team-${width}-${height}.png`);
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await action('lineup-carousel-next'); await settled(); assert.equal((await state()).teamId, (await state()).jerseyTeam);
    await send('Emulation.setEmulatedMedia', { features: [] });
    await action('lineup-wizard-close'); await action('lineup-draft-discard'); await closed();
    const legacy = createLineup('3v3', { name: '中性旧档案 · 转盘验收', nbaTeamId: null });
    await evaluate(`localStorage.setItem('${key}',${JSON.stringify(JSON.stringify({ schemaVersion: 1, profiles: [legacy], activeProfileId: legacy.id, playbackContext: null }))})`); await reload();
    await action('lineup-configure'); await modalStable(); await action('lineup-wizard-step', '[data-step="2"]'); await settled(); assert.equal((await state()).teamId, '', 'legacy null remains neutral');
    await evaluate("window.hc025StaleNext=document.querySelector('[data-action=lineup-carousel-next]');window.hc025StaleAll=document.querySelector('[data-action=lineup-carousel-all-open]')");
    await action('lineup-wizard-next'); assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"), '3', 'legacy neutral can continue');
    await evaluate(`(()=>{window.hc025OriginalSetItem=Storage.prototype.setItem;window.hc025Writes=0;Storage.prototype.setItem=function(k,v){if(k==='${key}'){window.hc025Writes++;window.hc025StaleNext.click();window.hc025StaleAll.click();}return window.hc025OriginalSetItem.call(this,k,v)};})()`);
    await evaluate("document.querySelector('[data-action=lineup-save]').click();document.querySelector('[data-action=lineup-save]')?.click()"); await closed();
    assert.equal(await evaluate('window.hc025Writes'), 1, 'busy repeated submission writes once');
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('${key}')).profiles[0].nbaTeamId`), null, 'stale destroyed carousel cannot mutate saved draft while busy');
    await evaluate('Storage.prototype.setItem=window.hc025OriginalSetItem;delete window.hc025OriginalSetItem');
    await action('lineup-configure'); await modalStable(); await action('lineup-wizard-step', '[data-step="2"]');
    await evaluate("(()=>{const old=document.querySelector('[data-action=lineup-carousel-next]');document.querySelector('[data-action=lineup-wizard-close]').click();old.click();})()");
    assert.equal(await evaluate("document.querySelector('#lineup-wizard-dialog').dataset.phase"), 'closing'); await closed();
    await action('lineup-configure'); await modalStable(); await action('lineup-wizard-step', '[data-step="2"]'); assert.equal((await state()).teamId, '', 'closing controls cannot choose a hidden team');
    await action('lineup-wizard-close'); await closed();
    await writeFile(path.join(folder, 'hc025-team-carousel.json'), JSON.stringify({ layouts, gestures, allTeams: NBA_TEAMS.map(t => t.id), initialNeutral: true, cancelToNeutral: true, legacyNeutralSaved: true, draftOnly: true, focusIsolation: true, staleBusyAndClosingHandlers: true }, null, 2));
  } finally {
    await send('Emulation.setEmulatedMedia', { features: [] });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await evaluate(`(()=>{if(window.hc025OriginalSetItem)Storage.prototype.setItem=window.hc025OriginalSetItem;${saved === null ? `localStorage.removeItem('${key}')` : `localStorage.setItem('${key}',${JSON.stringify(saved)})`};${savedSelection === null ? `localStorage.removeItem('${selectionKey}')` : `localStorage.setItem('${selectionKey}',${JSON.stringify(savedSelection)})`};})()`);
    await reload(); await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  }
}
