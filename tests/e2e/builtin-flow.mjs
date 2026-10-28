import assert from 'node:assert/strict';
import {mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';
import {createPlay} from '../../shared/engine.js';

export async function runBuiltinFlow({send,evaluate,wait,waitFor,folder}) {
  const nav=async view=>evaluate(`document.querySelector('[data-view-target=${view}]').click()`);
  const choose=async template=>{
    await evaluate(`(()=>{const s=document.querySelector('#template-picker');s.value=${JSON.stringify(template.id)};s.dispatchEvent(new Event('change'))})()`);
    await waitFor(`!document.body.classList.contains('is-loading') && document.querySelector('#template-picker').value===${JSON.stringify(template.id)} && document.querySelector('#play-title').value===${JSON.stringify(template.title)}`);
  };
  const transforms="Array.from(document.querySelectorAll('[data-player]')).map(p=>p.getAttribute('transform')).join('|')";
  const moving=async()=>{
    const before=await evaluate(transforms);
    await evaluate("document.querySelector('#restart-play').click()");
    await waitFor(`${transforms}!==${JSON.stringify(before)}`);
    await evaluate("document.querySelector('#play-toggle').click()");
  };
  // Seed only the isolated QA profile. The old application page saves selection,
  // so no personal Play is introduced into the current runtime.
  const old=createPlay('3v3');old.title='应删除的个人战术';
  await evaluate(`localStorage.setItem('halfcourt-draft-v1',${JSON.stringify(JSON.stringify(old))});localStorage.setItem('halfcourt-library-v1',${JSON.stringify(JSON.stringify(Array.from({length:40},()=>old)))});localStorage.setItem('halfcourt-draft-v1.corrupt-test','old draft copy');localStorage.setItem('halfcourt-library-v1.corrupt-test','old library copy');localStorage.setItem('unrelated-setting','keep')`);
  await send('Page.reload');
  await waitFor("localStorage.getItem('halfcourt-library-v1')==='[]' && localStorage.getItem('halfcourt-draft-v1')==='null' && Boolean(document.querySelector('[data-player]'))");
  assert.equal(await evaluate("document.querySelector('#play-title').value"),templates[0].title);
  assert.ok(await evaluate("!document.querySelector('#saved-list,#save-play,#new-play,#import-file,[data-library-source]')"),'personal library and creation/import controls are removed');
  assert.equal(await evaluate("document.querySelector('#play-title').readOnly"),true);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-draft-v1.corrupt-test')"),null);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1.corrupt-test')"),null);
  assert.equal(await evaluate("localStorage.getItem('unrelated-setting')"),'keep');

  await nav('edit');await evaluate("document.querySelector('#open-edit-note').click();let n=document.querySelector('#frame-note');n.value='只在本次生效的笔记';n.dispatchEvent(new Event('input'));document.querySelector('#close-edit-note').click()");
  await wait(60);
  assert.equal(await evaluate("document.querySelector('#frame-note').value"),'只在本次生效的笔记');
  await evaluate("document.querySelector('#add-frame').click()");
  assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),5);
  await evaluate("document.querySelector('#undo').click()");
  assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),4);
  await evaluate("document.querySelector('#redo').click()");
  assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),5);
  const downloads=path.join(folder,`downloads-${Date.now()}`);await mkdir(downloads,{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  for(const action of ['export-json','export-png']){
    await evaluate(`document.querySelector('#open-menu').click();document.querySelector('#${action}').click()`);
    await wait(100);
  }
  let files=[];for(let i=0;i<40;i++){files=await readdir(downloads);if(files.some(f=>f.endsWith('.png'))&&files.some(f=>f.endsWith('.json')))break;await wait(100);}
  assert.ok(files.some(f=>f.endsWith('.png')),'PNG export works');
  const exported=JSON.parse(await readFile(path.join(downloads,files.find(f=>f.endsWith('.json'))),'utf8'));
  assert.equal(exported.frames.length,5);assert.ok(exported.frames.some(frame=>frame.note==='只在本次生效的笔记'));
  await send('Page.reload');
  await waitFor("document.querySelectorAll('#frame-list button').length===4 && Boolean(document.querySelector('[data-player]'))");
  assert.notEqual(await evaluate("document.querySelector('#frame-note').value"),'只在本次生效的笔记','restart restores builtin content');
  assert.deepEqual(await evaluate("Object.keys(JSON.parse(localStorage.getItem('halfcourt-builtin-selection-v1'))).sort()"),['frameIndex','templateId']);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1')"),'[]','editing and switching never recreate a personal library');

  await nav('edit');
  const drag=await evaluate("(()=>{const p=document.querySelector('[data-player=\"attack-1\"]'),r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,before:p.getAttribute('transform')}})()");
  for(const [type,x,y,buttons] of [['mousePressed',drag.x,drag.y,1],['mouseMoved',drag.x+35,drag.y-20,1],['mouseReleased',drag.x+35,drag.y-20,0]])await send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount:1});
  assert.notEqual(await evaluate("document.querySelector('[data-player=\"attack-1\"]').getAttribute('transform')"),drag.before,'temporary player dragging works');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  const touch=await evaluate("(()=>{const p=document.querySelector('[data-player=\"attack-2\"]'),r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,before:p.getAttribute('transform')}})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y}]});await wait(60);
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+20,y:touch.y+15}]});await wait(60);
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await evaluate("document.querySelector('[data-player=\"attack-2\"]').getAttribute('transform')"),touch.before,'temporary touch dragging works');

  for(const mode of ['3v3','4v4']){
    await evaluate(`(()=>{let m=document.querySelector('#mode');m.value=${JSON.stringify(mode)};m.dispatchEvent(new Event('change'))})()`);
    await waitFor(`document.querySelectorAll('[data-player]').length===${mode==='3v3'?6:8} && !document.body.classList.contains('is-loading')`);
    assert.equal(await evaluate("document.querySelector('#template-picker').options.length"),10);
    for(const template of templates.filter(t=>t.mode===mode&&(t.kind||'offense')==='offense')){
      await choose(template);assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),template.build().frames.length);
      await moving();
    }
  }
  await nav('library');await evaluate("document.querySelector('#template-page-prev').click();document.querySelector('[data-template-id=\"high-low\"]').click()");
  await waitFor("document.querySelector('#template-picker').value==='high-low' && document.body.dataset.view==='play' && !document.body.classList.contains('is-loading')");
  await choose(templates.find(t=>t.id==='spain-pick-roll'));
  const before=await evaluate(transforms);
  await evaluate("(()=>{const native=window.requestAnimationFrame;window.requestAnimationFrame=cb=>native(()=>{window.requestAnimationFrame=native;cb(performance.now()-1000)});document.querySelector('#restart-play').click()})()");
  await waitFor(`${transforms}!==${JSON.stringify(before)}`);
  assert.equal(await evaluate("document.querySelector('#template-picker').disabled"),true);
  await evaluate("document.querySelector('#play-toggle').click()");
  await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});await moving();
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});

  const checkScreen=async(width,height,view)=>{
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});await nav(view);await wait(50);
    const layout=await evaluate("(()=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';return {width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,outside:[...document.querySelectorAll('button,select,input,textarea,#court')].filter(visible).map(e=>({id:e.id||e.dataset.viewTarget||e.dataset.tool,r:e.getBoundingClientRect().toJSON()})).filter(({r})=>r.width&&r.height&&(r.x < -2||r.y < -2||r.right>innerWidth+2||r.bottom>innerHeight+2)),badges:[...document.querySelectorAll('.template-meta')].filter(visible).filter(e=>e.getBoundingClientRect().bottom>e.closest('.template-card').getBoundingClientRect().bottom+1).map(e=>e.textContent)}})()");
    assert.ok(layout.sw<=width+2&&layout.sh<=height+2,JSON.stringify(layout));assert.deepEqual(layout.outside,[],`${width}x${height} ${view}: controls fit`);assert.deepEqual(layout.badges,[]);
  };
  for(const [width,height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]){
    for(const view of ['play','edit','library'])await checkScreen(width,height,view);await nav('play');
    if([390,844,1024].includes(width)){const name=width===390?'phone-portrait':width===844?'phone-landscape':'tablet-landscape';const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,`${name}.png`),Buffer.from(shot.data,'base64'));}
  }
  await nav('edit');
  for(let i=6;i<60;i++)await evaluate("document.querySelector('#add-frame').click()");
  await evaluate("document.querySelector('#frame-list button:last-child').click()");
  assert.equal(await evaluate("document.querySelector('#frame-counter').textContent"),'60 / 60');
  assert.equal(await evaluate("document.querySelector('#add-frame').disabled"),true);
  await checkScreen(360,640,'edit');
  for(let i=0;i<9;i++)await evaluate("document.querySelector('#step-page-prev').click()");
  assert.match(await evaluate("document.querySelector('#step-page-count').textContent"),/1\s*\/\s*10/);
  await evaluate("document.querySelector('#frame-list button').click();document.querySelector('#open-edit-note').click()");
  const note=Array.from({length:280},(_,i)=>`${String(i).padStart(3,'0')}🏀\n${i%3===0?'\n':''}`).join('').padEnd(2000,'传');
  await evaluate(`let n=document.querySelector('#frame-note');n.value=${JSON.stringify(note)};n.dispatchEvent(new Event('input'));document.querySelector('#close-edit-note').click()`);await wait(50);
  await nav('play');await evaluate("document.querySelector('#open-note').focus();document.querySelector('#open-note').click()");
  const readPages=async()=>{const pages=[];for(let i=0;i<100;i++){pages.push(await evaluate("document.querySelector('#note-preview').textContent"));assert.ok(await evaluate("(()=>{let p=document.querySelector('#note-preview');return p.scrollHeight<=p.clientHeight+1})()"),'explanation fits');if(await evaluate("document.querySelector('#note-page-next').disabled"))break;await evaluate("document.querySelector('#note-page-next').click()");}return pages;};
  const pages=await readPages();assert.equal(pages.join(''),note);
  for(let i=pages.length-1;i>1;i--)await evaluate("document.querySelector('#note-page-prev').click()");
  const anchor=note.indexOf(await evaluate("document.querySelector('#note-preview').textContent"));
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await wait(100);
  const rotated=await evaluate("document.querySelector('#note-preview').textContent"),offset=note.indexOf(rotated);assert.ok(offset>=0&&offset<=anchor&&anchor<offset+rotated.length);
  for(let i=0;i<100&&!await evaluate("document.querySelector('#note-page-prev').disabled");i++)await evaluate("document.querySelector('#note-page-prev').click()");
  assert.equal((await readPages()).join(''),note);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate("document.querySelector('#note-dialog').open"),false);assert.equal(await evaluate("document.activeElement.id"),'open-note');
  await nav('edit');await evaluate("document.querySelector('#open-edit-note').click()");
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:400,deviceScaleFactor:1,mobile:true});
  assert.ok(await evaluate("(()=>{let b=document.querySelector('#close-edit-note').getBoundingClientRect(),n=document.querySelector('#frame-note').getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight&&n.bottom<=innerHeight})()"));
  await evaluate("document.querySelector('#close-edit-note').click()");await nav('play');
  const guarded=await evaluate("(()=>{let p=document.querySelector('[data-player=\"attack-1\"]'),r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,transform:p.getAttribute('transform')}})()");
  for(const [type,x,y,buttons] of [['mousePressed',guarded.x,guarded.y,1],['mouseMoved',guarded.x+25,guarded.y+15,1],['mouseReleased',guarded.x+25,guarded.y+15,0]])await send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount:1});
  assert.equal(await evaluate("document.querySelector('[data-player=\"attack-1\"]').getAttribute('transform')"),guarded.transform);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.reload');await waitFor("document.querySelectorAll('#frame-list button').length===6 && document.querySelector('#template-picker').value==='spain-pick-roll'");
  assert.notEqual(await evaluate("document.querySelector('#frame-note').value"),note);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-draft-v1')"),'null');assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1')"),'[]');
  assert.deepEqual(await evaluate("Object.keys(JSON.parse(localStorage.getItem('halfcourt-builtin-selection-v1'))).sort()"),['frameIndex','templateId']);
}
