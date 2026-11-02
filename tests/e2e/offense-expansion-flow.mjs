import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import {waitForWizardMotion} from './wizard-helpers.mjs';
import {confirmedRolePlan} from './role-fixtures.mjs';
import { ballPosition } from '../../shared/engine.js';
import { findLibraryCard } from './library-deck-helpers.mjs';
import { selectArchive } from './archive-helpers.mjs';

const newIds = ['post-split', 'slip-screen', 'offball-flare', 'hammer', 'zoom-handoff', 'screen-the-screener'];

/** Actual app/template/body-type selection integration in the runner's isolated profile. */
export async function runOffenseExpansionFlow({ send, evaluate, wait, waitFor, folder }) {
  const nav = async view => {
    await evaluate(`document.querySelector('[data-view-target=${view}]').click()`);
    await waitFor(`document.body.dataset.view===${JSON.stringify(view)}&&!document.body.dataset.pageTransition`);
  };
  const action = async (id, extra = '') => {await evaluate(`document.querySelector(${JSON.stringify(`[data-action="${id}"]${extra}`)}).click()`);await waitForWizardMotion({waitFor})};
  const pause = () => evaluate("(()=>{const b=document.querySelector('#play-toggle');if(b.getAttribute('aria-pressed')==='true')b.click()})()");
  const catalog = async mode => {
    await nav('library');
    await evaluate(`(()=>{const n=document.querySelector('#mode');n.value=${JSON.stringify(mode)};n.dispatchEvent(new Event('change'));document.querySelector('[data-kind-target=offense]').click()})()`);
  };
  const metrics = [];
  const backup = await evaluate("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1')})");
  assert.equal(templates.length, 26);
  assert.deepEqual(templates.slice(20).map(template => template.id), newIds, 'old twenty IDs keep their original order before the six additions');
  assert.equal(templates.slice(20).reduce((sum,template)=>sum+template.build().frames.length,0),43);

  // Explicit saved member identities; every role is separately confirmed in this fixture.
  const profiles = newIds.map((id,index)=>{
    const template=templates.find(item=>item.id===id),profile=createLineup(template.mode,{id:'hc027-'+id,name:'新增配合验证 '+(index+1),nbaTeamId:'GSW'});
    profile.players.forEach((player,roleIndex)=>Object.assign(player,{id:'member-'+roleIndex,name:'实测队员'+(roleIndex+1),number:[7,12,23,30][roleIndex]}));
    profile.bodyType=template.bodyTypes[0];
    return validateLineup(profile);
  });
  try {
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await pause();
    for (const id of newIds) {
      const template = templates.find(item => item.id === id), play = template.build();
      await catalog(template.mode);
      await findLibraryCard({ evaluate, waitFor }, id);
      assert.equal(await evaluate("document.querySelector('#template-list').dataset.paged"), 'false');
      assert.equal(await evaluate("document.querySelectorAll('.library-card-heading').length"), 9);
      await evaluate(`document.querySelector('.library-card-heading[data-template-id="${id}"]').click()`);
      await waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
      const locked = await evaluate(`(()=>{
        document.querySelector('[data-play-template="${id}"]').click();
        const expanded=document.querySelector('#template-list').dataset.expandedId;
        const locked=[...document.querySelectorAll('.library-card-heading,.library-card-court,.library-card-play')].every(n=>n.disabled);
        document.querySelector('.library-card-return:not([hidden])')?.click();
        document.querySelector('.library-card-heading:not([data-template-id="${id}"])')?.click();
        return locked&&document.querySelector('#template-list').dataset.expandedId===expanded;
      })()`);
      assert.equal(locked, true, `${id}: synchronous source/loading guard locks all catalog actions`);
      await waitFor(`document.body.dataset.view==='play'&&!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(id)}`);
      await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'&&Number(document.querySelector('#timeline-scrub').value)>1");
      await pause();
      const frames = [];
      for (let index = 0; index < play.frames.length; index++) {
        await evaluate(`(()=>{const n=document.querySelector('#timeline-scrub');n.value=${index / (play.frames.length - 1) * 1000};n.dispatchEvent(new Event('input'));n.dispatchEvent(new Event('change'))})()`);
        const actual = await boardState();
        assert.equal(actual.counter, `${index + 1} / ${play.frames.length}`);
        assert.equal(actual.current, String(index), 'timeline marker follows the real current frame, including steps seven/eight');
        assert.ok(actual.note.includes(play.frames[index].note.slice(0, 30)), `${id}/${index}: current explanation matches actual frame`);
        for (const player of play.frames[index].players) {
          const point = actual.players[player.id];
          assert.ok(point && Math.hypot(point[0] - player.x, point[1] - player.y) < .001, `${id}/${index}: actual ${player.id} position`);
        }
        const expectedBall = ballPosition(play.frames[index]);
        assert.ok(actual.ball && Math.hypot(actual.ball[0] - expectedBall.x, actual.ball[1] - expectedBall.y) < .001, `${id}/${index}: real holder/free-ball location stays synchronized`);
        frames.push({ index, holderId: play.frames[index].ball.holderId, ...actual });
      }
      if (id === 'zoom-handoff') assert.equal(play.frames.at(-1).ball.holderId, 'attack-4');
      metrics.push({ id, frames });
    }

    // Historical plans are retained, but the new body-type flow enters numbered practice directly.
    await pause();
    const archive={schemaVersion:2,profiles,activeProfileId:profiles[0].id,rolePlans:Object.fromEntries(profiles.map((p,i)=>[p.id,{[newIds[i]]:confirmedRolePlan(p,newIds[i])}])),playbackContext:null};
    await evaluate(`localStorage.setItem('halfcourt-lineups-v1',${JSON.stringify(JSON.stringify(archive))})`);
    await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-conditions]'))");
    for(let index=0;index<profiles.length;index++){
      const profile=profiles[index],id=newIds[index];
      if(index){await nav('lineups');await selectArchive({evaluate,waitFor},profile.id);await waitFor("document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'");}
      await action('lineup-conditions');await waitFor("document.body.dataset.tacticSelection==='true'&&!document.body.dataset.pageTransition");
      assert.equal(await evaluate("document.querySelector('#tactic-selection-panel').dataset.stage"),'tactics');
      await action('selection-picker');await waitFor("document.querySelector('#selection-tactic-menu').dataset.phase==='open'");
      const candidates=await evaluate("[...document.querySelectorAll('[data-selection-template]')].map(n=>n.dataset.selectionTemplate)");
      assert.ok(candidates.includes(id));assert.ok(templates.filter(t=>candidates.includes(t.id)).every(t=>t.mode===profile.mode&&t.bodyTypes.includes(profile.bodyType)));
      await evaluate(`document.querySelector('[data-selection-template="${id}"]').click()`);await waitFor("document.querySelector('#selection-tactic-menu').dataset.phase==='closed'");
      await action('selection-play');await waitFor("document.body.dataset.view==='play'&&!document.body.dataset.lineupContext&&!document.body.classList.contains('is-loading')");
      assert.equal(await evaluate("document.querySelector('#template-picker').value"),id);
      const stored=await evaluate("JSON.parse(localStorage.getItem('halfcourt-lineups-v1'))");
      assert.equal(stored.playbackContext,null);assert.deepEqual(stored.rolePlans[profile.id][id],archive.rolePlans[profile.id][id]);
      assert.equal(await evaluate("document.querySelector('#lineup-legend').hidden"),true);
      for(const member of profile.players)assert.ok(!await evaluate(`document.querySelector('#players-layer').textContent.includes(${JSON.stringify(member.name)})`));
      metrics.push({id,bodyType:profile.bodyType,candidates,numberedPractice:true,historicalPlanPreserved:true});
      if(index===0){
        const ctx={source:'role-confirmations',profileId:profile.id,profileRevision:profile.revision,templateId:id,roleVersion:1};
        await evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('halfcourt-lineups-v1'));s.playbackContext=${JSON.stringify(ctx)};localStorage.setItem('halfcourt-lineups-v1',JSON.stringify(s))})()`);
        await send('Page.reload');await waitFor("Boolean(document.querySelector('#players-layer [data-player]'))");await nav('play');await verifySourceFailure(id,profile.id);
      }
    }
    await writeFile(path.join(folder, 'hc027-expansion-playback-roles.json'), JSON.stringify(metrics, null, 2) + '\n');
  } finally {
    await pause();
    await evaluate(`(()=>{for(const[k,v]of Object.entries(${JSON.stringify({ 'halfcourt-lineups-v1': backup.archive, 'halfcourt-builtin-selection-v1': backup.selection })})){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}})()`);
    await send('Page.reload');
    await waitFor("Boolean(document.querySelector('#players-layer [data-player]'))");
    await nav('lineups');
  }

  async function boardState() {
    return evaluate(`(()=>{const point=n=>n&&n.getAttribute('transform').match(/translate\\(([^)]+)\\)/)[1].trim().split(/[ ,]+/).map(Number);return{
      counter:document.querySelector('#frame-counter').textContent,current:document.querySelector('#frame-list [aria-current=step]')?.dataset.frameIndex,note:document.querySelector('#live-step-note').textContent,
      players:Object.fromEntries([...document.querySelectorAll('#players-layer [data-player]')].map(n=>[n.dataset.player,point(n)])),ball:point(document.querySelector('#ball-layer [data-ball]'))
    }})()`);
  }
  async function verifySourceFailure(id, profileId) {
    await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:1,mobile:true});await wait(120);
    // A nonzero real step makes an accidental failed-load reset observable.
    const frameCount=templates.find(template=>template.id===id).build().frames.length;
    await evaluate(`(()=>{const n=document.querySelector('#timeline-scrub');n.value=${1000/(frameCount-1)};n.dispatchEvent(new Event('input'));n.dispatchEvent(new Event('change'))})()`);
    await catalog('3v3'); await findLibraryCard({ evaluate, waitFor }, id);
    await evaluate(`document.querySelector('.library-card-heading[data-template-id="${id}"]').click()`);
    await waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
    assert.equal(await evaluate("document.querySelector('#template-list').dataset.layout"),'overlay','source failure also exercises the short-screen return action');
    const original = await sourceFacts();
    await evaluate("window.hc027SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='halfcourt-lineups-v1'&&JSON.parse(v).playbackContext===null)throw Error('HC027 simulated source-clear failure');return window.hc027SetItem.call(this,k,v)}");
    try {
      const pendingLocked=await evaluate(`(()=>{
        document.querySelector('[data-play-template="${id}"]').click();
        const locked=[...document.querySelectorAll('.library-card-heading,.library-card-court,.library-card-play')].every(n=>n.disabled);
        const back=document.querySelector('.library-card-return:not([hidden])');back.click();
        return locked&&document.querySelector('#template-list').dataset.expandedId===${JSON.stringify(id)};
      })()`);
      assert.equal(pendingLocked,true,'pending load locks visible overlay return as well as titles and CTA');
      await waitFor("!document.body.classList.contains('is-loading')&&document.querySelector('#template-list').getAttribute('aria-busy')==='false'");
      assert.equal(await evaluate('document.body.dataset.view'), 'library');
      assert.equal(await evaluate('document.body.dataset.lineupContext'), '', 'historical source must not relabel numbered practice');
      assert.equal(await evaluate("JSON.parse(localStorage.getItem('halfcourt-lineups-v1')).playbackContext.profileId"),profileId);
      assert.equal(await evaluate("document.querySelector('#template-list').dataset.paged"), 'false');
      assert.equal(await evaluate("document.querySelectorAll('.library-card-heading').length"), 9);
      assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"), id);
      assert.deepEqual(await sourceFacts(), original, 'failed source clear preserves exact archive, selection bytes and nonzero current step');
      assert.equal(await evaluate(`document.querySelector('[data-play-template="${id}"]').disabled`), false, 'failed same-page card can retry');
      const pausedPreview=await evaluate(`({...document.querySelector('.library-card-body:not([hidden]) .library-card-court').dataset})`);
      assert.equal(pausedPreview.playing,'false','failed source clear leaves inline animation paused');
      assert.equal(pausedPreview.rafCount,'0');
      await wait(120);
      assert.equal(await evaluate("document.querySelector('.library-card-body:not([hidden]) .library-card-court').dataset.progress"),pausedPreview.progress,'failed load keeps the same preview position');
    } finally { await evaluate('Storage.prototype.setItem=window.hc027SetItem;delete window.hc027SetItem'); }
    await evaluate(`document.querySelector('[data-play-template="${id}"]').click()`);
    await waitFor("document.body.dataset.view==='play'&&!document.body.dataset.lineupContext&&!document.body.classList.contains('is-loading')");
    await pause();
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(120);
  }
  async function sourceFacts(){
    return evaluate("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1'),template:document.querySelector('#template-picker').value,title:document.querySelector('#play-title').value,progress:document.querySelector('#timeline-scrub').value,step:document.querySelector('#frame-counter').textContent,players:document.querySelector('#players-layer').innerHTML})");
  }
}
