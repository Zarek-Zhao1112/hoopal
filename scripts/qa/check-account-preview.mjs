import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createBrowserSession} from './browser-session.mjs';

const folder=path.resolve(`artifacts/qa/account-preview-${Date.now()}`);
await mkdir(folder,{recursive:true});
const report={scope:'HC-045 independent account UI prototype; not real authentication, cloud sync or device acceptance',metrics:[],interactions:[],motion:[],screenshots:[],passed:false};
const session=await createBrowserSession({rootDirectory:process.cwd(),name:'account-preview'});
const{send,evaluate,wait,waitFor}=session;
const size=(width,height)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
const state=()=>evaluate('window.accountPreview.state()');
const settled=()=>waitFor("!['opening','closing'].includes(document.querySelector('#account-dialog')?.dataset.phase)");
const open=async(demo='guest')=>{
 await send('Page.navigate',{url:`${session.origin}/frontend/previews/account-center/index.html?embedded=1&state=${demo}`});
 await waitFor("document.readyState==='complete'&&Boolean(window.accountPreview)");
 await evaluate('Promise.all([Promise.resolve(window.accountPreview.ready),document.fonts.ready]).then(()=>true)');
 await waitFor("[...document.images].every(n=>n.complete&&n.naturalWidth>0)");
 await settled();await wait(50);
};
const click=async selector=>{
 const point=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Unavailable '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!(r.width>0&&r.height>0&&x>=0&&y>=0&&x<=innerWidth&&y<=innerHeight&&(h===n||n.contains(h))))throw Error('Cannot hit '+${JSON.stringify(selector)});return{x,y}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
 await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});
};
const action=name=>click(`button[data-action="${name}"]`);
const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(r.data,'base64'));report.screenshots.push(name)};
const geometry=async label=>{
 const g=await evaluate(`(()=>{const d=document.querySelector('#account-dialog[open]'),scope=d||document.querySelector('#app-screen');return{label:${JSON.stringify(label)},width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,dialog:Boolean(d),controls:[...scope.querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:n.dataset.action||n.dataset.viewTarget||n.id,x:r.x,y:r.y,w:r.width,h:r.height,fit:r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:h===n||n.contains(h)}}),guard:window.__accountGuards,broken:[...document.images].filter(n=>n.getClientRects().length&&(!n.complete||!n.naturalWidth)).map(n=>n.src)}})()`);
 report.metrics.push(g);await writeFile(path.join(folder,'current-layout.json'),JSON.stringify(g,null,2));
 assert.ok(g.scrollWidth<=g.width+1&&g.scrollHeight<=g.height+1,`${label} no document scrolling`);
 assert.ok(g.controls.length>0,`${label} nonempty controls`);
 for(const c of g.controls)assert.ok(c.w>0&&c.h>0&&c.fit&&c.hit,`${label}: ${JSON.stringify(c)}`);
 assert.deepEqual(g.guard,[],`${label} no storage or service calls`);assert.deepEqual(g.broken,[]);return g;
};
const close=async method=>{
 if(method==='escape'){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27})}
 else await action(method||'modal-close');
 await waitFor("!document.querySelector('#account-dialog').open");await settled();
};
try{
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__accountGuards=[];const deny=n=>function(){window.__accountGuards.push(n);throw Error('Independent prototype must not use '+n)};for(const n of['getItem','setItem','removeItem','clear'])Storage.prototype[n]=deny('Storage.'+n);IDBFactory.prototype.open=deny('indexedDB.open');IDBFactory.prototype.deleteDatabase=deny('indexedDB.deleteDatabase');window.fetch=deny('fetch');XMLHttpRequest.prototype.open=deny('XMLHttpRequest');navigator.sendBeacon=deny('sendBeacon');`});
 const viewports=[[390,844],[360,640],[360,400],[844,390],[1024,768]];
 for(const[width,height]of viewports){
  await size(width,height);
  for(const demo of['guest','member','login']){
   await open(demo);await geometry(`${width}x${height}/${demo}`);
   assert.equal((await state()).demoState,demo);
   if(demo==='member')assert.ok(await evaluate("/示例|演示/.test(document.body.innerText)&&/示意|未接入/.test(document.querySelector('[data-action=backup-open]').textContent)"),'Member and sync explicitly illustrative');
   if(demo==='login')await close('continue-local');
   else assert.deepEqual(await evaluate("[...document.querySelectorAll('[data-view-target]')].map(n=>n.textContent.trim())"),['更衣室','训练场','战术库','我的']);
   if(demo!=='login'||width===390){if(demo==='login'){await action('login-open');await settled()}await shot(`${demo}-${width}x${height}.png`);if(demo==='login')await close();}
  }
  await open();
  for(const actionName of['team-manage','team-create','backup-open','settings-open','about-open']){
   await action(actionName);await settled();await geometry(`${width}x${height}/${actionName}`);await close();
  }
  await click('[data-action=team-select][data-team-id=BOS]');assert.equal((await state()).activeTeamId,'BOS');
  if((await state()).view!=='account')await click('[data-view-target=account]');
  for(const view of['lineups','play','library','account']){await click(`[data-view-target=${view}]`);await wait(60);assert.equal((await state()).view,view);await geometry(`${width}x${height}/view-${view}`)}
  await action('login-open');await settled();
  const isolation=await evaluate("[...document.querySelectorAll('#app-screen button,#app-screen input,#app-screen a[href]')].every(n=>n.disabled||n.tabIndex===-1||n.closest('[inert]'))");assert.ok(isolation,'Background isolated during modal');
  for(const view of['play','library'])await evaluate(`document.querySelector('[data-view-target=${view}]').click()`);assert.equal((await state()).view,'account','Background DOM activation also guarded');
  await evaluate("(()=>{const a=document.querySelector('#account-email'),p=document.querySelector('#account-password');a.value='demo@example.invalid';p.value='demonstration-only';for(const n of[a,p])n.dispatchEvent(new Event('input',{bubbles:true}))})()");
  await action('password-toggle');assert.equal(await evaluate("document.querySelector('#account-password').type"),'text');await action('password-toggle');
  await action('login-submit');await wait(40);assert.notEqual((await state()).demoState,'member','Form never authenticates an invented user');assert.ok(await evaluate("/未接入/.test(document.querySelector('#account-dialog').textContent)"));await geometry(`${width}x${height}/login-feedback`);
  for(const name of['register-open','recover-open']){await action(name);await settled();await geometry(`${width}x${height}/${name}`);await close();await action('login-open');await settled()}
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.ok(await evaluate("document.querySelector('#account-dialog').contains(document.activeElement)"),'Tab remains inside panel');
  await close('escape');assert.equal(await evaluate('document.activeElement.dataset.action'),'login-open','Escape returns focus to initiating login control');
  report.interactions.push({width,height,teamSelection:true,modalIsolation:true,noFakeAuthentication:true,registerRecovery:true,focusReturn:true});
 }
 await size(390,844);await open();
 await evaluate(`(()=>{window.__accountMotion=[];window.__accountMotionRunning=true;const tick=()=>{const d=document.querySelector('#account-dialog'),p=d?.querySelector('.panel'),r=p?.getBoundingClientRect();window.__accountMotion.push({time:performance.now(),phase:d?.dataset.phase,open:d?.open,top:r?.y,height:r?.height,transform:p&&getComputedStyle(p).transform,background:getComputedStyle(document.querySelector('#app-screen')).filter});if(window.__accountMotionRunning)requestAnimationFrame(tick)};requestAnimationFrame(tick)})()`);
 await action('login-open');await wait(140);await shot('login-opening.png');await settled();await wait(45);await evaluate('window.__accountMotionRunning=false');
 const motion=await evaluate('window.__accountMotion'),opening=motion.filter(s=>s.open&&s.phase==='opening');assert.ok(opening.length>2,'Actual animation has intermediate opening frames');assert.ok(Math.max(...opening.map(s=>s.top))-Math.min(...opening.map(s=>s.top))>12,'Panel visibly rises');assert.ok(opening.some(s=>/blur\(/.test(s.background)),'Background gradually blurs');report.motion=motion;
 await evaluate(`(()=>{window.__accountClosing=[];window.__accountClosingRunning=true;const tick=()=>{const d=document.querySelector('#account-dialog'),p=d?.querySelector('.panel');window.__accountClosing.push({time:performance.now(),phase:d?.dataset.phase,open:d?.open,top:p?.getBoundingClientRect().y,background:getComputedStyle(document.querySelector('#app-screen')).filter});if(window.__accountClosingRunning)requestAnimationFrame(tick)};requestAnimationFrame(tick)})()`);
 await close();await evaluate('window.__accountClosingRunning=false');
 const closing=await evaluate('window.__accountClosing');report.closing=closing;const visibleClosing=closing.filter(s=>s.open&&s.phase==='closing');assert.ok(visibleClosing.length>2);assert.ok(Math.max(...visibleClosing.map(s=>s.top))-Math.min(...visibleClosing.map(s=>s.top))>12,'Panel visibly returns downwards');
 await action('login-open');await settled();const shadePoint=await evaluate("(()=>{const r=document.querySelector('#account-dialog .panel').getBoundingClientRect();if(r.top<20)throw Error('Portrait panel must leave a backdrop');return{x:innerWidth/2,y:r.top/2}})()");
 await send('Input.dispatchMouseEvent',{type:'mousePressed',...shadePoint,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...shadePoint,button:'left',buttons:0,clickCount:1});await waitFor("!document.querySelector('#account-dialog').open");
 await evaluate("window.accountPreview.setState('login');window.accountPreview.setState('guest');window.accountPreview.setState('member')");await wait(520);assert.equal((await state()).demoState,'member');assert.equal(await evaluate("document.querySelector('#account-dialog').open"),false);await geometry('rapid-example-switch');await open();
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await action('login-open');await wait(35);assert.equal(await evaluate("document.querySelector('#account-dialog').dataset.phase"),'open');await geometry('reduced-motion');await close();await send('Emulation.setEmulatedMedia',{features:[]});
 await size(1500,1100);await send('Page.navigate',{url:`${session.origin}/frontend/previews/account-center/overview.html`});await waitFor("document.readyState==='complete'&&document.querySelectorAll('iframe').length===3&&[...document.querySelectorAll('iframe')].every(f=>f.contentDocument?.readyState==='complete'&&f.contentWindow?.accountPreview&&[...f.contentDocument.images].every(n=>n.complete&&n.naturalWidth>0))");
 await evaluate("Promise.all([...document.querySelectorAll('iframe')].map(f=>Promise.all([Promise.resolve(f.contentWindow.accountPreview.ready),f.contentDocument.fonts.ready]))).then(()=>true)");await wait(100);await shot('overview.png');
 const baseline=JSON.parse(await readFile('artifacts/design/account-center-concept/production-before.json','utf8'));for(const item of baseline)assert.equal(createHash('sha256').update(await readFile(item.file)).digest('hex'),item.sha256,item.file+' unchanged');report.productionHashesUnchanged=baseline.length;
 assert.deepEqual(session.errors,[]);assert.deepEqual(session.remoteRequests,[]);report.passed=true;
}catch(error){report.error=error.stack;try{await shot('failure.png')}catch{}throw error}
finally{
 report.errors=session.errors;report.remoteRequests=session.remoteRequests;
 await session.close();report.tempCleaned=await access(session.tempFolder).then(()=>false,()=>true);
 await writeFile(path.join(folder,'run.json'),JSON.stringify(report,null,2));
 await writeFile('artifacts/qa/latest-account-preview.json',JSON.stringify({folder:path.relative(process.cwd(),folder),passed:report.passed},null,2));
 console.log(JSON.stringify({folder,passed:report.passed,layouts:report.metrics.length,interactions:report.interactions.length,productionHashesUnchanged:report.productionHashesUnchanged,tempCleaned:report.tempCleaned,error:report.error}));
}
