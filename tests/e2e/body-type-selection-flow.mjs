import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';
import {createLineup} from '../../shared/lineups.js';
import {getBodyTypes,filterTacticsByBodyType} from '../../shared/tactic-body-types.js';
import {createRolePlan,setRoleResponse} from '../../shared/tactic-roles.js';
import {emptyLineupState} from '../../frontend/src/storage/lineups.js';

/** Disposable-browser proof for the real built app; never writes phone fixtures. */
export async function runBodyTypeSelectionFlow({send,evaluate,wait,waitFor,folder}){
 const archiveKey='halfcourt-lineups-v1',selectionKey='halfcourt-builtin-selection-v1',panel='#tactic-selection-panel',menu='#selection-tactic-menu',court=`${panel} [data-action=selection-preview]`;
 const original=await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}'),width:innerWidth,height:innerHeight,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})`);
 const report={groups:[],layouts:[],motion:[],cancelNoWrites:false,preferenceRetry:false,perTeamMemory:false,libraryOtherMode:false,directNumberedTraining:false,sourceFailureRetry:false,previewLoop:false};
 const idle=()=>waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')");
 const state=()=>evaluate(`JSON.parse(localStorage.getItem('${archiveKey}'))`);
 const archiveRaw=()=>evaluate(`localStorage.getItem('${archiveKey}')`);
 const menuClosed=()=>waitFor(`!document.querySelector('${menu}')||document.querySelector('${menu}').dataset.phase==='closed'`);
 async function point(selector){return evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Unavailable '+${JSON.stringify(selector)});n.scrollIntoView({block:'nearest',inline:'nearest'});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)}+'; hit='+h?.outerHTML?.slice(0,180));return{x,y}})()`);}
 async function click(selector){const p=await point(selector);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});}
 async function key(key){await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});}
 const shot=async name=>{const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(image.data,'base64'));};
 async function restoreFault(){await evaluate("if(window.__hc056Fault){Storage.prototype.setItem=window.__hc056Fault;delete window.__hc056Fault;}if(window.__hc056AuditOriginal){Storage.prototype.setItem=window.__hc056AuditOriginal;delete window.__hc056AuditOriginal;}");}
 async function documentWith(archive,selection={templateId:'pick-roll',frameIndex:2}){
  await restoreFault();await evaluate("if(document.querySelector('#play-toggle')?.getAttribute('aria-pressed')==='true')document.querySelector('#play-toggle').click()");
  const raw=typeof archive==='string'?archive:JSON.stringify(archive),selected=typeof selection==='string'?selection:JSON.stringify(selection);
  const token=await send('Page.addScriptToEvaluateOnNewDocument',{source:`${archive===null?`localStorage.removeItem('${archiveKey}')`:`localStorage.setItem('${archiveKey}',${JSON.stringify(raw)})`};${selection===null?`localStorage.removeItem('${selectionKey}')`:`localStorage.setItem('${selectionKey}',${JSON.stringify(selected)})`};window.__hc056Fresh=true;`});
  try{await evaluate('window.__hc056Fresh=false');await send('Page.reload');await waitFor("window.__hc056Fresh&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')");}finally{await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:token.identifier});}await idle();
 }
 function profile(mode,id,bodyType=null){const p=createLineup(mode,{id,name:`体型${mode}球队`,nbaTeamId:'BOS',bodyType});p.players.forEach((m,i)=>{m.name=`队员${i+1}`;m.number=11+i;});return p;}
 const archiveFor=(profiles,active=profiles[0]?.id)=>({...emptyLineupState(),profiles,activeProfileId:active||null});
 async function nav(view){await click(`[data-view-target=${view}]`);await waitFor(`document.body.dataset.view==='${view}'&&!document.body.dataset.pageTransition`);}
 async function openTeam(){await nav('lineups');await click('[data-action=lineup-conditions]');await waitFor(`document.body.dataset.tacticSelection==='true'`);await idle();}
 async function bodyPage(){if(await evaluate(`document.querySelector('${panel}').dataset.stage==='tactics'`))await click(`${panel} [data-action=selection-change-body]`);await waitFor(`document.querySelector('${panel}').dataset.stage==='body'`);}
 async function selectBody(id){await bodyPage();await click(`${panel} [data-action=body-type][data-body-type="${id}"]`);}
 async function view(){await click(`${panel} [data-action=selection-view]`);await waitFor(`document.querySelector('${panel}').dataset.stage==='tactics'&&document.querySelector('${panel}').getAttribute('aria-busy')==='false'`);}
 async function openMenu(){await click(`${panel} [data-action=selection-picker]`);await waitFor(`document.querySelector('${menu}').dataset.phase==='open'`);}
 const playFacts=()=>evaluate("({template:document.querySelector('#template-picker').value,counter:document.querySelector('#frame-counter').textContent,progress:document.querySelector('#timeline-scrub').value,players:document.querySelector('#players-layer').innerHTML,selection:localStorage.getItem('halfcourt-builtin-selection-v1')})");
 async function geometry(label){
  const reachable=[];
  if(await evaluate(`document.querySelector('${panel}').dataset.stage==='body'`)){
   const ids=await evaluate(`[...document.querySelectorAll('${panel} [data-action=body-type]')].map(n=>n.dataset.bodyType)`);
   for(const id of ids)reachable.push({id,...await point(`${panel} [data-action=body-type][data-body-type="${id}"]`)});
   await evaluate(`document.querySelector('${panel} .selection-body-content').scrollTop=0`);
  }
  const facts=await evaluate(`(()=>{const p=document.querySelector('${panel}'),r=p.getBoundingClientRect(),nav=document.querySelector('.view-nav').getBoundingClientRect();const controls=[...p.querySelectorAll('button')].filter(n=>n.dataset.action!=='body-type'&&!n.disabled&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>{const b=n.getBoundingClientRect(),h=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{action:n.dataset.action,bodyType:n.dataset.bodyType,rect:b.toJSON(),hit:h===n||n.contains(h)}});return{label:${JSON.stringify(label)},width:innerWidth,height:innerHeight,stage:p.dataset.stage,box:r.toJSON(),navTop:nav.top,overflow:document.documentElement.scrollWidth>innerWidth+2||document.documentElement.scrollHeight>innerHeight+2,controls}})()`);facts.bodyCardsReachableByInternalScroll=reachable;
  assert.equal(facts.overflow,false,label);assert.ok(facts.box.bottom<=facts.navTop+1,label+' above nav');
  for(const c of facts.controls){assert.ok(c.rect.width>0&&c.rect.height>0&&c.rect.x>=-1&&c.rect.y>=-1&&c.rect.right<=facts.width+1&&c.rect.bottom<=facts.height+1,`${label} fits ${JSON.stringify(c)}`);assert.equal(c.hit,true,`${label} hit ${JSON.stringify(c)}`);}report.layouts.push(facts);
 }
 try{
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  // Every body and side is exercised through the live team entrance and glass list.
  for(const mode of ['3v3','4v4']){
   const p=profile(mode,`hc056-${mode}`);await documentWith(archiveFor([p]));await openTeam();
   const before=await playFacts(),raw=await archiveRaw();
   await evaluate(`window.__hc056AuditOriginal=Storage.prototype.setItem;window.__hc056ArchiveWrites=[];Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}')window.__hc056ArchiveWrites.push(v);return window.__hc056AuditOriginal.call(this,k,v)}`);
   await selectBody('one-big');assert.equal(await archiveRaw(),raw,'draft card clicks do not save');
   await key('Escape');await waitFor("document.body.dataset.tacticSelection==='false'");assert.equal(await archiveRaw(),raw,'cancel unsubmitted preference does not save');assert.deepEqual(await evaluate('window.__hc056ArchiveWrites'),[],'unsubmitted card selection and cancellation perform zero archive writes');await restoreFault();report.cancelNoWrites=true;await openTeam();
   for(const type of getBodyTypes(mode)){
    await selectBody(type.id);await view();
    for(const kind of ['offense','defense']){
     await click(`${panel} [data-action=selection-kind][data-kind=${kind}]`);await openMenu();
     const rows=await evaluate(`[...document.querySelectorAll('${menu} [data-selection-template]')].map(n=>({id:n.dataset.selectionTemplate,title:n.querySelector('strong').textContent,note:n.querySelector('small').textContent,selected:n.getAttribute('aria-selected')}))`);
     const expected=filterTacticsByBodyType(templates,{mode,kind,bodyType:type.id});assert.deepEqual(rows.map(r=>r.id),expected.map(t=>t.id));assert.ok(rows.every(r=>r.note&&r.title));assert.equal(rows.filter(r=>r.selected==='true').length,1);assert.ok(expected.every(t=>t.mode===mode));
     assert.ok(await evaluate("[...document.querySelectorAll('.view-nav button')].every(n=>n.disabled)"),'glass menu locks nav');
     assert.ok(await evaluate(`document.activeElement?.matches('${menu} [data-selection-template]')`),'current row receives focus');
     await key('Escape');await menuClosed();assert.equal(await evaluate(`document.activeElement?.dataset.action`),'selection-picker');
     report.groups.push({mode,kind,bodyType:type.id,ids:rows.map(r=>r.id)});
    }
   }
   assert.deepEqual(await playFacts(),before,'body preference and candidate browsing keep main Play and progress');assert.ok(!(await state()).playbackContext);
   await nav('lineups');await openTeam();assert.equal(await evaluate(`document.querySelector('${panel}').dataset.bodyType`),'similar');assert.equal(await evaluate(`document.querySelector('${panel}').dataset.stage`),'tactics');
  }
  assert.equal(report.groups.length,14);
  // Save failures retain the selected card and may retry without an empty archive.
  const a=profile('3v3','hc056-a'),b=profile('4v4','hc056-b','three-big');await documentWith(archiveFor([a,b]));await openTeam();await selectBody('two-big');const unchanged=await archiveRaw();
  await evaluate(`window.__hc056Fault=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}')throw Error('HC056 preference write fault');return window.__hc056Fault.call(this,k,v)}`);
  await click(`${panel} [data-action=selection-view]`);await waitFor(`document.querySelector('${panel}').getAttribute('aria-busy')==='false'`);assert.equal(await evaluate(`document.querySelector('${panel}').dataset.stage`),'body');assert.equal(await evaluate(`document.querySelector('${panel} [data-action=body-type][aria-pressed=true]').dataset.bodyType`),'two-big');assert.equal(await archiveRaw(),unchanged);await shot('hc056-preference-failed.png');await restoreFault();await view();assert.equal((await state()).profiles.find(p=>p.id===a.id).bodyType,'two-big');report.preferenceRetry=true;
  // Switch saved teams through actual archive cards; each remembers its own type.
  await nav('archives');await click(`[data-action=lineup-select][data-profile-id="${b.id}"]`);await idle();await openTeam();assert.equal(await evaluate(`document.querySelector('${panel}').dataset.mode`),'4v4');assert.equal(await evaluate(`document.querySelector('${panel}').dataset.bodyType`),'three-big');
  await nav('archives');await click(`[data-action=lineup-select][data-profile-id="${a.id}"]`);await idle();await openTeam();assert.equal(await evaluate(`document.querySelector('${panel}').dataset.mode`),'3v3');assert.equal(await evaluate(`document.querySelector('${panel}').dataset.bodyType`),'two-big');report.perTeamMemory=true;
  // A library card may browse another size, but cannot save its preference onto this team.
  await nav('lineups');await nav('library');await evaluate("(()=>{const n=document.querySelector('#mode');n.value='4v4';n.dispatchEvent(new Event('change'));document.querySelector('[data-kind-target=offense]').click()})()");await waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
  await click('[data-template-id=high-low]');await waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");await click('[data-conditions-template=high-low]');await waitFor(`document.querySelector('${panel}').dataset.mode==='4v4'`);const currentRaw=await archiveRaw();await selectBody('three-big');await view();assert.equal(await archiveRaw(),currentRaw);assert.equal((await state()).activeProfileId,a.id);assert.ok(await evaluate(`document.querySelector('${panel} .selection-heading').textContent.includes('浏览模式')`));report.libraryOtherMode=true;
  // Direct training needs no role plan and stays generic-numbered.
  assert.deepEqual((await state()).rolePlans,{});await click(`${panel} [data-action=selection-play]`);await waitFor("document.body.dataset.view==='play'&&!document.body.dataset.pageTransition");assert.equal(await evaluate("document.querySelector('#template-picker').value"),'high-low');assert.equal(await evaluate("document.body.dataset.lineupContext"),'');assert.equal(await evaluate("document.querySelector('#lineup-legend').hidden"),true);assert.ok(await evaluate("[...document.querySelectorAll('#players-layer [data-player] title')].every(n=>!n.textContent.includes('队员'))"));report.directNumberedTraining=true;
  // Old valid source is not silently dropped on read or lost on a failed clear.
  const sourced=profile('3v3','hc056-source','one-big'),t=templates.find(t=>t.id==='pick-roll');let plan=createRolePlan(t,sourced);for(let i=0;i<t.roles.length;i++)plan=setRoleResponse(plan,t.roles[i].id,{status:'available',memberId:sourced.players[i].id},t,sourced);
  const old=archiveFor([sourced]);old.rolePlans={[sourced.id]:{'pick-roll':plan}};old.playbackContext={source:'role-confirmations',profileId:sourced.id,profileRevision:1,templateId:t.id,roleVersion:1};await documentWith(old,{templateId:t.id,frameIndex:2});await openTeam();const sourceRaw=await archiveRaw(),sourcePlay=await playFacts();
  await evaluate(`window.__hc056Fault=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}'&&!JSON.parse(v).playbackContext)throw Error('HC056 old source clear fault');return window.__hc056Fault.call(this,k,v)}`);
  await click(`${panel} [data-action=selection-play]`);await waitFor(`document.querySelector('${panel}').getAttribute('aria-busy')==='false'`);assert.equal(await evaluate('document.body.dataset.view'),'library');assert.equal(await archiveRaw(),sourceRaw);assert.deepEqual(await playFacts(),sourcePlay);assert.equal(await evaluate(`document.querySelector('${panel}').dataset.stage`),'tactics');await restoreFault();await click(`${panel} [data-action=selection-play]`);await waitFor("document.body.dataset.view==='play'&&!document.body.dataset.pageTransition");assert.equal((await state()).playbackContext,null);assert.deepEqual((await state()).rolePlans,old.rolePlans);report.sourceFailureRetry=true;
  // Real preview runs naturally, loops once and pauses for the local picker and leaving.
  await documentWith(archiveFor([profile('3v3','hc056-loop','one-big')]));await openTeam();await waitFor(`document.querySelector('${court}').dataset.playing==='true'`);const previewStart=await evaluate(`({...document.querySelector('${court}').dataset})`);await wait(1250);assert.ok(Number(await evaluate(`document.querySelector('${court}').dataset.progress`))>Number(previewStart.progress));
  await waitFor(`Number(document.querySelector('${court}').dataset.cycle)>=1`);report.previewLoop=true;
  await openMenu();const paused=await evaluate(`({...document.querySelector('${court}').dataset})`);assert.equal(paused.playing,'false');assert.equal(paused.rafCount,'0');await wait(120);assert.equal(await evaluate(`document.querySelector('${court}').dataset.progress`),paused.progress);await key('Escape');await menuClosed();assert.equal(await evaluate(`document.querySelector('${court}').dataset.playing`),'false');await click(court);await wait(100);assert.equal(await evaluate(`document.querySelector('${court}').dataset.playing`),'true');
  await send('Emulation.setFocusEmulationEnabled',{enabled:false});const backgroundTab=await send('Target.createTarget',{url:'about:blank'});
  try{await send('Target.activateTarget',{targetId:backgroundTab.targetId});await waitFor("document.visibilityState==='hidden'");const hidden=await evaluate(`({...document.querySelector('${court}').dataset})`);assert.equal(hidden.playing,'false');assert.equal(hidden.rafCount,'0');await wait(150);assert.equal(await evaluate(`document.querySelector('${court}').dataset.progress`),hidden.progress);report.actualBackgroundPause=true;}
  finally{await send('Target.closeTarget',{targetId:backgroundTab.targetId});await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});}
  assert.equal(await evaluate(`document.querySelector('${court}').dataset.playing`),'false');await click(court);await wait(80);
  await evaluate(`window.__hc056OldPreview=document.querySelector('${court}')`);await nav('lineups');assert.equal(await evaluate("window.__hc056OldPreview.dataset.rafCount"),'0');assert.equal(await evaluate("window.__hc056OldPreview.dataset.playing"),'false');
  // Geometry retains phone/tablet outer frame and short viewport reachable controls.
  for(const[width,height]of[[390,844],[360,400],[844,390],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
   for(const mode of ['3v3','4v4']){await documentWith(archiveFor([profile(mode,`hc056-layout-${mode}`)]));await openTeam();await geometry(`${width}x${height}/${mode}/body`);const number=await evaluate(`document.querySelector('${panel} [data-action=body-type] svg').querySelectorAll('[data-figure-size]').length`);assert.equal(number,mode==='3v3'?3:4);await selectBody('one-big');await view();await geometry(`${width}x${height}/${mode}/tactics`);await openMenu();const box=await evaluate(`(()=>{const n=document.querySelector('${menu} [data-selection-menu-panel]'),r=n.getBoundingClientRect();return{rect:r.toJSON(),width:innerWidth,height:innerHeight,blur:getComputedStyle(n).backdropFilter}})()`);assert.ok(box.rect.width>100&&box.rect.height>50&&box.rect.x>=-1&&box.rect.y>=-1&&box.rect.right<=box.width+1&&box.rect.bottom<=box.height+1);await key('Escape');await menuClosed();}
  }
  // Natural 220/160 timings, current cancellation, outside and one committed quick intent.
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await documentWith(archiveFor([profile('3v3','hc056-motion','similar')]));await openTeam();await send('Emulation.setEmulatedMedia',{features:[]});
  await evaluate(`window.__hc056Motion=[];window.__hc056Trace=true;(()=>{const record=source=>{const n=document.querySelector('${menu}');if(n&&window.__hc056Trace)window.__hc056Motion.push({time:performance.now(),phase:n.dataset.phase,visible:n.dataset.visible||'',source})};const tick=()=>{record('raf');if(window.__hc056Trace)requestAnimationFrame(tick)};window.__hc056MotionObserver=new MutationObserver(()=>record('mutation'));window.__hc056MotionObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['data-phase','data-visible']});requestAnimationFrame(tick)})()`);
  const noSelect=await playFacts(),motionArchive=await archiveRaw();await openMenu();await key('Escape');await menuClosed();await wait(35);await evaluate('window.__hc056Trace=false');const trace=await evaluate('window.__hc056Motion');await writeFile(path.join(folder,'hc056-selection-motion-trace.json'),JSON.stringify(trace,null,2));const opening=trace.filter(t=>t.phase==='opening'&&t.visible==='true'),opened=trace.find(t=>t.phase==='open'),closing=trace.find(t=>t.phase==='closing'),closed=closing&&trace.find(t=>t.phase==='closed'&&t.time>=closing.time);
  assert.ok(opening.filter(t=>t.source==='raf').length>=3&&opened&&closing&&closed,JSON.stringify(trace));const visible=opening.find(t=>t.source==='mutation')||opening[0],openMs=opened.time-visible.time,closeMs=closed.time-closing.time;assert.ok(openMs>=210&&openMs<700,JSON.stringify({openMs,trace}));assert.ok(closeMs>=150&&closeMs<600,JSON.stringify({closeMs,trace}));report.motion.push({openMs,closeMs});
  await openMenu();const options=await evaluate(`[...document.querySelectorAll('${menu} [data-selection-template]')].map(n=>n.dataset.selectionTemplate)`),active=await evaluate(`document.querySelector('${menu} [aria-selected=true]').dataset.selectionTemplate`);await click(`${menu} [data-selection-template="${active}"]`);await menuClosed();assert.deepEqual(await playFacts(),noSelect);assert.equal(await archiveRaw(),motionArchive);
  await openMenu();await send('Input.dispatchMouseEvent',{type:'mousePressed',x:4,y:4,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:4,y:4,button:'left',buttons:0,clickCount:1});await menuClosed();assert.equal(await archiveRaw(),motionArchive);
  await openMenu();const chosen=options.find(id=>id!==active);assert.ok(chosen);const pnt=await point(`${menu} [data-selection-template="${chosen}"]`);for(let i=0;i<2;i++){await send('Input.dispatchMouseEvent',{type:'mousePressed',...pnt,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...pnt,button:'left',buttons:0,clickCount:1});}await menuClosed();assert.equal(await evaluate(`document.querySelector('${court}').dataset.previewId`),chosen);assert.equal(await archiveRaw(),motionArchive);assert.deepEqual(await playFacts(),noSelect);
  await shot('hc056-selection-glass-closed.png');await openMenu();await shot('hc056-selection-glass-open.png');await key('Escape');await menuClosed();
  await writeFile(path.join(folder,'hc056-body-type-selection.json'),JSON.stringify(report,null,2));
 }finally{
  await restoreFault();await evaluate('window.__hc056Trace=false;window.__hc056MotionObserver?.disconnect();delete window.__hc056MotionObserver;delete window.__hc056OldPreview');await send('Emulation.setEmulatedMedia',{features:original.reduced?[{name:'prefers-reduced-motion',value:'reduce'}]:[]});await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Emulation.setDeviceMetricsOverride',{width:original.width,height:original.height,deviceScaleFactor:1,mobile:original.width<600});await documentWith(original.archive,original.selection);
  assert.equal(await archiveRaw(),original.archive,'body flow restores exact original archive bytes');assert.equal(await evaluate(`localStorage.getItem('${selectionKey}')`),original.selection);assert.deepEqual(await evaluate('({width:innerWidth,height:innerHeight})'),{width:original.width,height:original.height});assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),original.reduced);
 }
}
