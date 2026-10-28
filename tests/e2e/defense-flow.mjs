import assert from 'node:assert/strict';
import {writeFile,mkdir,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';

export async function runDefenseFlow({send,evaluate,wait,waitFor,folder}) {
  const nav=async view=>evaluate(`document.querySelector('[data-view-target=${view}]').click()`);
  const choose=async template=>{
    await evaluate(`(()=>{let s=document.querySelector('#template-picker');s.value=${JSON.stringify(template.id)};s.dispatchEvent(new Event('change'))})()`);
    await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(template.id)}`);
  };
  const bluePositions="[...document.querySelectorAll('#players-layer [data-player^=\"defense-\"]')].map(p=>p.getAttribute('transform')).join('|')";
  const sourceBefore=await evaluate("({title:document.querySelector('#play-title').value,frame:document.querySelector('#frame-counter').textContent,positions:[...document.querySelectorAll('#players-layer [data-player]')].map(p=>p.getAttribute('transform')).join('|')})");
  await nav('library');await evaluate("document.querySelector('[data-kind-target=defense]').click()");
  assert.equal(await evaluate("document.body.dataset.catalogKind"),'defense');
  assert.equal(await evaluate("document.body.dataset.tacticKind"),'offense','browsing a category does not change the loaded source');
  assert.deepEqual(await evaluate("({title:document.querySelector('#play-title').value,frame:document.querySelector('#frame-counter').textContent,positions:[...document.querySelectorAll('#players-layer [data-player]')].map(p=>p.getAttribute('transform')).join('|')})"),sourceBefore);
  assert.equal(await evaluate("document.querySelector('#template-count').textContent"),'4套防守');
  assert.equal(await evaluate("document.querySelectorAll('.template-card .template-thumbnail').length"),4);
  const first=templates.find(t=>t.kind==='defense'&&t.mode==='4v4');
  await evaluate(`document.querySelector('[data-template-id="${first.id}"]').click()`);
  await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value===${JSON.stringify(first.id)}&&document.body.dataset.view==='play'`);
  assert.equal(await evaluate("document.body.dataset.tacticKind"),'defense');
  assert.equal(await evaluate("document.querySelector('#tactic-kind-label').textContent"),'防守战术');
  assert.equal(await evaluate("document.querySelector('#opponent-toggle-label').textContent"),'显示对手');
  assert.equal(await evaluate("document.querySelector('#template-picker').options.length"),5);
  assert.ok(await evaluate("[...document.querySelectorAll('#players-layer [data-player^=\"attack-\"]')].every(p=>Number(p.getAttribute('opacity'))<0.5)"));

  for(const mode of ['3v3','4v4']) {
    await evaluate(`(()=>{const m=document.querySelector('#mode');m.value=${JSON.stringify(mode)};m.dispatchEvent(new Event('change'))})()`);
    await waitFor(`!document.body.classList.contains('is-loading')&&document.querySelector('#mode').value===${JSON.stringify(mode)}&&document.body.dataset.tacticKind==='defense'`);
    assert.equal(await evaluate("document.querySelectorAll('.template-card').length"),4);
    assert.equal(await evaluate("document.querySelector('#template-picker').options.length"),5);
    for(const template of templates.filter(t=>t.mode===mode&&t.kind==='defense')) {
      await choose(template);
      assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),6);
      const before=await evaluate(bluePositions);
      await evaluate("document.querySelector('#restart-play').click()");
      await waitFor(`${bluePositions}!==${JSON.stringify(before)}`);
      assert.equal(await evaluate("document.querySelector('#template-picker').disabled"),true);
      await evaluate("document.querySelector('#play-toggle').click()");
      assert.ok(await evaluate("[...document.querySelectorAll('#routes-layer [data-route]')].every(p=>p.dataset.actor.startsWith('defense-'))"),'playback routes focus on defenders');
    }
  }

  await choose(first);
  const originalBlue=await evaluate(bluePositions);
  await evaluate("document.querySelector('#toggle-defense').checked=false;document.querySelector('#toggle-defense').dispatchEvent(new Event('change'))");
  assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"),4,'defenders remain visible when opponents are hidden');
  assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player^=\"attack-\"],[data-ball]').length"),0);
  assert.equal(await evaluate(bluePositions),originalBlue);
  const hiddenBefore=await evaluate(bluePositions);
  await evaluate("document.querySelector('#restart-play').click()");
  await waitFor(`${bluePositions}!==${JSON.stringify(hiddenBefore)}`);
  assert.equal(await evaluate("document.querySelectorAll('[data-ball]').length"),0,'opponent ball stays hidden during interpolated animation');
  await evaluate("document.querySelector('#play-toggle').click();let s=document.querySelector('#timeline-scrub');s.value=100;s.dispatchEvent(new Event('input'))");
  assert.equal(await evaluate("document.querySelectorAll('[data-ball]').length"),0,'opponent ball stays hidden when scrubbing between steps');
  await choose(first);
  await nav('edit');await evaluate("document.querySelector('[data-tool=run]').click()");
  const start=await evaluate("(()=>{let p=document.querySelector('#players-layer [data-player=\"defense-1\"]'),r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  const routeCount=await evaluate("document.querySelectorAll('#routes-layer [data-route]').length");
  for(const [type,x,y,buttons] of [['mousePressed',start.x,start.y,1],['mouseMoved',start.x+25,start.y+20,1],['mouseReleased',start.x+25,start.y+20,0]])await send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons,clickCount:1});
  assert.equal(await evaluate("document.querySelectorAll('#routes-layer [data-route]').length"),routeCount+1);
  assert.equal(await evaluate("document.querySelector('#routes-layer [data-route]:last-child').dataset.actor"),'defense-1','new routes bind the visible blue actor');
  assert.equal(await evaluate("document.querySelector('#routes-layer [data-route]:last-child path:last-child').getAttribute('stroke')"),'#2878b5');

  const downloads=path.join(folder,`downloads-defense-${Date.now()}`);await mkdir(downloads,{recursive:true});
  await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await evaluate("document.querySelector('#open-menu').click();document.querySelector('#export-json').click()");
  let files=[];for(let i=0;i<30;i++){files=await readdir(downloads);if(files.some(f=>f.endsWith('.json')))break;await wait(100);}
  const exported=JSON.parse(await readFile(path.join(downloads,files.find(f=>f.endsWith('.json'))),'utf8'));
  assert.equal(exported.frames[0].paths.at(-1).playerId,'defense-1');
  assert.ok(!Object.hasOwn(exported,'kind'),'kind metadata does not change exported Play');

  await evaluate("document.querySelector('[data-tool=select]').click()");
  const touch=await evaluate("(()=>{let p=document.querySelector('#players-layer [data-player=\"defense-2\"]'),r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,before:p.getAttribute('transform')}})()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y}]});await wait(60);
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+18,y:touch.y+12}]});await wait(60);
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await evaluate("document.querySelector('#players-layer [data-player=\"defense-2\"]').getAttribute('transform')"),touch.before,'blue touch editing works without opponents');
  await nav('library');await evaluate("document.querySelector('[data-kind-target=offense]').click()");
  assert.equal(await evaluate("document.querySelector('#template-count').textContent"),'9套进攻');
  assert.equal(await evaluate("document.body.dataset.tacticKind"),'defense');
  await send('Page.reload');
  await waitFor(`document.body.dataset.tacticKind==='defense'&&document.querySelector('#template-picker').value===${JSON.stringify(first.id)}&&Boolean(document.querySelector('[data-player]'))`);
  assert.equal(await evaluate("document.body.dataset.catalogKind"),'defense','reloaded category follows the persisted builtin source');
  assert.equal(await evaluate("document.querySelectorAll('#routes-layer [data-route]').length"),first.build().frames[0].paths.filter(p=>p.playerId?.startsWith('defense-')).length,'temporary routes were not stored');
  assert.deepEqual(await evaluate("Object.keys(JSON.parse(localStorage.getItem('halfcourt-builtin-selection-v1'))).sort()"),['frameIndex','templateId']);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1')"),'[]');
  assert.ok(await evaluate("!document.querySelector('#saved-list,#save-play,#new-play,#import-file')"));

  for(const [width,height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    for(const view of ['play','edit','library']) {
      await nav(view);await wait(50);
      const layout=await evaluate("(()=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';return {sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,controls:[...document.querySelectorAll('button,input,select,textarea,#court')].filter(visible).map(e=>({id:e.id||e.dataset.kindTarget||e.dataset.viewTarget,r:e.getBoundingClientRect().toJSON()})).filter(({r})=>r.width&&r.height&&(r.x < -2||r.y < -2||r.right>innerWidth+2||r.bottom>innerHeight+2)),clipped:[...document.querySelectorAll('.template-thumbnail,.template-meta,.template-card strong')].filter(visible).filter(e=>{let r=e.getBoundingClientRect(),c=e.closest('.template-card').getBoundingClientRect();return r.x<c.x-1||r.right>c.right+1||r.y<c.y-1||r.bottom>c.bottom+1}).map(e=>e.className.baseVal||e.className)}})()");
      assert.ok(layout.sw<=width+2&&layout.sh<=height+2,JSON.stringify(layout));assert.deepEqual(layout.controls,[],`${width}x${height} ${view}: defense controls fit`);assert.deepEqual(layout.clipped,[],`${width}x${height} ${view}: defense card contents fit`);
      if(width===390&&(view==='play'||view==='library')){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,`defense-${view}-phone.png`),Buffer.from(shot.data,'base64'));}
    }
  }
  await nav('play');
}
