import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';
import {libraryControls} from './library-flow-helpers.mjs';

export async function runReadOnlyFlow({send,evaluate,wait,waitFor,folder,downloadFolder}) {
  const c=libraryControls({send,evaluate,wait,waitFor}),nav=c.nav;
  assert.equal(await evaluate('document.body.dataset.view'),'lineups');
  assert.ok(await evaluate("!document.querySelector('[data-view-target=edit],[data-tool],#frame-note,#add-frame,#delete-frame,#undo,#redo,#reset,#edit-note-dialog,#saved-list,#save-play,#new-play,#import-file')"));
  await evaluate("localStorage.setItem('halfcourt-draft-v1','{old-private-play}');localStorage.setItem('halfcourt-library-v1','[\"old-private-library\"]');localStorage.setItem('halfcourt-library-v1.corrupt-old','old-copy');localStorage.setItem('unrelated-setting','keep')");
  await send('Page.reload');await waitFor("Boolean(document.querySelector('#players-layer [data-player]'))");
  assert.equal(await evaluate("localStorage.getItem('halfcourt-draft-v1')"),'null');
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1')"),'[]');
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1.corrupt-old')"),null);
  assert.equal(await evaluate("localStorage.getItem('unrelated-setting')"),'keep');
  for(const mode of ['3v3','4v4'])for(const kind of ['offense','defense']) {
    for(const template of templates.filter(t=>t.mode===mode&&t.kind===kind)) {
      await c.open();if(await evaluate("document.querySelector('#tactic-library-dialog').dataset.mode")!==mode)await c.mode(mode);await c.kind(kind);await c.choose(template.id);

      await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(template.id)}`);
      const frameCount=template.build().frames.length;
      assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),frameCount);
      assert.equal(await evaluate("document.querySelector('#frame-counter').textContent"),`1 / ${frameCount}`);
      const steps=await evaluate("[...document.querySelectorAll('#frame-list button')].map(n=>Number(n.dataset.frameIndex))");
      assert.deepEqual(steps,Array.from({length:frameCount},(_,index)=>index),'all real steps are present together on the playback timeline');
      assert.equal(await evaluate("Boolean(document.querySelector('#step-page-prev,#step-page-next'))"),false,'obsolete step pagination is removed');
      const before=await evaluate("document.querySelector('#players-layer').innerHTML");
      await evaluate("document.querySelector('#play-toggle').click()");
      await waitFor(`document.querySelector('#players-layer').innerHTML!==${JSON.stringify(before)}`);
      assert.equal(await evaluate("document.querySelector('#template-picker').disabled"),true);
      await evaluate("document.querySelector('#play-toggle').click()");
    }
  }
  await evaluate("document.querySelector('#toggle-defense').checked=false;document.querySelector('#toggle-defense').dispatchEvent(new Event('change'))");
  await evaluate("document.querySelector('#frame-list [data-frame-index=\"0\"]').click();document.querySelector('#play-toggle').click()");await wait(250);
  assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"),4);
  assert.equal(await evaluate("document.querySelectorAll('#ball-layer [data-ball]').length"),0,'training court opponent ball remains hidden while moving');
  assert.equal(await evaluate("[...document.querySelectorAll('#tactic-library-dialog [data-action=selection-preview]')].reduce((n,b)=>n+Number(b.dataset.rafCount||0),0)"),0,'hidden library previews have no running frame callbacks');
  await evaluate("document.querySelector('#play-toggle').click();(()=>{let n=document.querySelector('#timeline-scrub');n.value=100;n.dispatchEvent(new Event('input'))})()");
  assert.equal(await evaluate("document.querySelectorAll('#ball-layer [data-ball]').length"),0);
  await evaluate("document.querySelector('#toggle-defense').checked=true;document.querySelector('#toggle-defense').dispatchEvent(new Event('change'))");
  await evaluate("document.querySelector('#open-note').click()");
  assert.ok(await evaluate("document.querySelector('#note-preview').textContent.length>0"));
  await evaluate("document.querySelector('#close-note').click()");
  const original=await evaluate("[...document.querySelectorAll('#players-layer [data-player]')].map(p=>p.getAttribute('transform')).join('|')");
  const target=await evaluate("(()=>{let r=document.querySelector('#players-layer [data-player]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:target.x,y:target.y,button:'left',buttons:1,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x+20,y:target.y+25,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:target.x+20,y:target.y+25,button:'left',buttons:0});
  assert.equal(await evaluate("[...document.querySelectorAll('#players-layer [data-player]')].map(p=>p.getAttribute('transform')).join('|')"),original,'court is read only');
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await evaluate("document.querySelector('#frame-list [data-frame-index=\"0\"]').click();document.querySelector('#play-toggle').click()");await waitFor("Number(document.querySelector('#timeline-scrub').value)>1");
  await evaluate("document.querySelector('#play-toggle').click()");
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  const downloads=downloadFolder||path.join(folder,`downloads-readonly-${Date.now()}`);await mkdir(downloads,{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await evaluate("document.querySelector('#open-menu').click();document.querySelector('#export-json').click()");
  let files=[];for(let i=0;i<30;i++){files=await readdir(downloads);if(files.some(f=>f.endsWith('.json')))break;await wait(100)}
  const play=JSON.parse(await readFile(path.join(downloads,files.find(f=>f.endsWith('.json'))),'utf8'));
  assert.ok(play.frames.length>=4);assert.ok(!Object.hasOwn(play,'kind'));assert.ok(!Object.hasOwn(play,'profiles'));
  await evaluate("document.querySelector('#open-menu').click();document.querySelector('#export-png').click()");
  for(let i=0;i<40;i++){files=await readdir(downloads);if(files.some(f=>f.endsWith('.png')))break;await wait(100)}
  const png=await readFile(path.join(downloads,files.find(f=>f.endsWith('.png'))));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),1600);assert.equal(png.readUInt32BE(20),1432);
  const exportCorner=await evaluate(`new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);resolve([...context.getImageData(80,180,1,1).data])};image.onerror=()=>reject(Error('Exported PNG does not decode'));image.src='data:image/png;base64,${png.toString('base64')}'})`);
  assert.ok(exportCorner.every((channel,index)=>Math.abs(channel-[210,178,139,255][index])<=2),'PNG retains its original court surround even though the live board background is transparent');
  assert.equal(await evaluate("Boolean(document.querySelector('#court #frame-counter,#court #training-title,#court .training-capsule'))"),false,'scene overlays do not become exported SVG children');
  await writeFile(path.join(folder,'export-sample.json'),JSON.stringify(play,null,2));
  await writeFile(path.join(folder,'export-sample.png'),png);
  await nav('lineups');
}
