import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';
import {interpolateBoards,ballPosition} from '../../shared/engine.js';

export async function runInlinePreviewFlow({send,evaluate,wait,waitFor,folder}){
 const nav=async view=>{await evaluate(`document.querySelector('[data-view-target=${view}]').click()`);await waitFor(`document.body.dataset.view==='${view}'&&!document.body.dataset.pageTransition`)};
 const settle=()=>waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
 const current=".library-card-body:not([hidden]) .library-card-court";
 const state=()=>evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(current)});return n?{...n.dataset}:null})()`);
 const scene=()=>evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(current)});return{players:Object.fromEntries([...n.querySelectorAll('[data-player]')].map(p=>[p.dataset.player,p.getAttribute('transform')])),ball:n.querySelector('[data-ball]').getAttribute('transform')}})()`);
 const facts=()=>evaluate(`({title:document.querySelector('#play-title').value,id:document.querySelector('#template-picker').value,progress:document.querySelector('#timeline-scrub').value,step:document.querySelector('#frame-list [aria-current=step]')?.dataset.frameIndex,selection:localStorage.getItem('halfcourt-builtin-selection-v1'),archive:localStorage.getItem('halfcourt-lineups-v1'),players:[...document.querySelectorAll('#players-layer [data-player]')].map(n=>[n.dataset.player,n.getAttribute('transform')])})`);
 const click=async selector=>{await settle();const point=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Unavailable '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!r.width||!r.height||!(hit===n||n.contains(hit)))throw Error('Unhittable '+${JSON.stringify(selector)});return{x,y}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1})};
 const until=async expression=>{for(let i=0;i<400;i++){if(await evaluate(expression))return;await wait(40)}throw Error('Inline condition timed out: '+expression)};
 const catalog=async(mode,kind)=>{await evaluate(`(()=>{const n=document.querySelector('#mode');n.value='${mode}';n.dispatchEvent(new Event('change'));document.querySelector('[data-kind-target=${kind}]').click()})()`);await settle()};
 const open=async id=>{await click(`.library-card-heading[data-template-id=${id}]`);await settle()};
 const activeCount=()=>evaluate("[...document.querySelectorAll('#template-list .library-card-court')].reduce((n,b)=>n+Number(b.dataset.rafCount||0),0)");
 const observations=[];
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await evaluate("(()=>{const b=document.querySelector('#play-toggle');if(b.getAttribute('aria-pressed')==='true')b.click()})()");
 await nav('library');await catalog('3v3','offense');const original=await facts();
 await open('give-go');let running=await state();assert.equal(running.playing,'true');assert.equal(await activeCount(),1);
 const initialScene=await scene();await wait(1250);assert.notDeepEqual(await scene(),initialScene,'visible pieces/ball move inside the card');
 await click(current);const paused=await state(),pausedScene=await scene();assert.equal(paused.playing,'false');assert.equal(await activeCount(),0);await wait(180);assert.equal((await state()).progress,paused.progress);assert.deepEqual(await scene(),pausedScene);assert.deepEqual(await facts(),original,'card motion and pause preserve main Play, assignment archive and selection bytes');
 // Compare the actual rendered SVG at a real paused time to the real engine.
 const play=templates.find(t=>t.id==='give-go').build(),position=Number(paused.progress)*(play.frames.length-1),index=Math.floor(position),fraction=position-index,t=Math.max(0,(fraction-.18)/.82),expected=interpolateBoards(play.frames[index],play.frames[index+1],t*t*(3-2*t));
 const point=s=>s.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);
 for(const p of expected.players){const actual=point(pausedScene.players[p.id]);assert.ok(Math.hypot(actual[0]-p.x,actual[1]-p.y)<.001)}const actualBall=point(pausedScene.ball),expectedBall=ballPosition(expected);assert.ok(Math.hypot(actualBall[0]-expectedBall.x,actualBall[1]-expectedBall.y)<.001);
 observations.push({case:'automatic real movement, pause and actual engine equality',running,paused});
 await click(current);await wait(180);assert.ok(Number((await state()).progress)>Number(paused.progress));
 await open('give-go');assert.equal(await activeCount(),0);await open('give-go');assert.ok(Number((await state()).progress)<.1,'reopening starts at frame zero');
 await until("document.querySelector('.library-card-body:not([hidden]) .library-card-court').dataset.phase==='hold'");const hold=await state(),holdStarted=Date.now();assert.equal(Number(hold.progress),1);await wait(230);await click(current);const holdPaused=await state(),holdScene=await scene();assert.equal(Number(holdPaused.progress),1);await wait(280);assert.equal((await state()).holdRemaining,holdPaused.holdRemaining);assert.deepEqual(await scene(),holdScene);await click(current);await until("Number(document.querySelector('.library-card-body:not([hidden]) .library-card-court').dataset.cycle)>0");const looped=await state();assert.ok(Number(looped.progress)<.15);assert.ok(Date.now()-holdStarted>=1000);observations.push({case:'natural full cycle, 1s end hold and preserved remaining wait',hold,holdPaused,looped});
 await click(current);const beforeResize=await state(),beforeResizeScene=await scene();await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:1,mobile:true});await wait(120);assert.equal((await state()).progress,beforeResize.progress);assert.deepEqual(await scene(),beforeResizeScene);assert.equal(await evaluate("document.querySelector('#template-list').dataset.layout"),'overlay');await click('.library-card-return:not([hidden])');assert.equal(await activeCount(),0);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(100);await open('post-split');
 await evaluate("document.querySelector('[data-template-id=slip-screen]').click();document.querySelector('[data-template-id=offball-flare]').click()");await settle();assert.equal((await state()).previewId,'offball-flare');assert.equal(await activeCount(),1);
 // Leaving the actual library pauses all old instances, including hidden DOM.
 await nav('lineups');assert.equal(await activeCount(),0);await wait(120);await nav('library');assert.equal(await activeCount(),0);assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'');
 await catalog('3v3','offense');await open('give-go');await wait(100);
 // The shared runner pins focus to keep other animation checks deterministic.
 // Release that override before testing a genuine background-tab transition.
 await send('Emulation.setFocusEmulationEnabled',{enabled:false});
 const other=await send('Target.createTarget',{url:'about:blank'});let hidden;
 try{await send('Target.activateTarget',{targetId:other.targetId});await until("document.visibilityState==='hidden'");hidden=await state();assert.equal(hidden.playing,'false');assert.equal(await activeCount(),0);await wait(200);assert.equal((await state()).progress,hidden.progress)}
 finally{await send('Target.closeTarget',{targetId:other.targetId});await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true})}
 await wait(100);assert.equal((await state()).playing,'false','returning does not catch up or auto resume');await click(current);await wait(150);assert.ok(Number((await state()).progress)>Number(hidden.progress));observations.push({case:'real tab background and manual continue',hidden,continued:await state()});
 assert.deepEqual(await facts(),original,'loops, resize, background and card switching never change main state or storage');
 await catalog('4v4','defense');await open('defense-4v4-zone');assert.equal((await state()).playing,'true');assert.equal(await activeCount(),1);const focused=await evaluate("[...document.querySelectorAll('.library-card-body:not([hidden]) [data-player]')].map(n=>[n.dataset.team,Number(n.getAttribute('opacity'))])");assert.ok(focused.filter(([team])=>team==='defense').every(([,opacity])=>opacity===1));assert.ok(focused.filter(([team])=>team==='attack').every(([,opacity])=>opacity<1));
 await nav('lineups');assert.equal(await activeCount(),0);await writeFile(path.join(folder,'hc031-inline-playback.json'),JSON.stringify({observations,mainPlayAndStorageUnchanged:true,singleAnimationLoop:true,actualHiddenChecked:true},null,2)+'\n');
}
