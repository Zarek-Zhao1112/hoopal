import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createLineup } from '../../shared/lineups.js';

const archiveKey = 'halfcourt-lineups-v1', selectionKey = 'halfcourt-builtin-selection-v1';
const hash = value => createHash('sha256').update(value ?? '<null>').digest('hex');
const sizes = [[320,568],[360,400],[360,640],[390,844],[393,819],[640,360],[844,390],[1024,768],[1280,800]];

// Installed by CDP before the real application. This records observations only;
// it neither changes the production clock nor exposes a production debug API.
function observerScript(expectedName) {
  return `(()=>{
    const samples=window.__hc041Samples=[];let count=0;
    const rect=n=>n?.getBoundingClientRect().toJSON()||null;
    function sample(){
      const s=document.querySelector('#startup-screen'),brand=document.querySelector('#startup-brand'),rim=document.querySelector('#startup-rim'),cab=document.querySelector('#startup-cabinet'),skip=document.querySelector('#startup-skip');
      if(s){const title=brand?.querySelector('strong'),tag=brand?.querySelector('span'),r=skip?.getBoundingClientRect(),hit=r&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);let plate=null,nameplateEvidence=null,nameplateTextRange=null,nameplateTextBox=null,nameplateVisibleText=null;
        if(cab){const walker=document.createTreeWalker(cab,NodeFilter.SHOW_TEXT);for(let n; n=walker.nextNode();){
          const parent=n.parentElement;if(parent?.namespaceURI!=='http://www.w3.org/1999/xhtml'||n.textContent.trim()!==${JSON.stringify(expectedName)})continue;
          const button=parent.closest('button'),owner=button||(n.textContent.trim()==='等待入队'&&parent.tagName==='SPAN'?parent:null);if(!owner||!cab.contains(owner))continue;
          const bounds=owner.getBoundingClientRect();if(!bounds.width||!bounds.height)continue;
          const range=document.createRange();range.selectNodeContents(n);const ink=range.getBoundingClientRect(),box=parent.getBoundingClientRect();if(!ink.width||!ink.height||!box.width||!box.height)continue;
          const left=Math.max(ink.left,box.left),top=Math.max(ink.top,box.top),right=Math.min(ink.right,box.right),bottom=Math.min(ink.bottom,box.bottom);
          plate=bounds.toJSON();nameplateEvidence='HTML '+owner.tagName;nameplateTextRange=ink.toJSON();nameplateTextBox=box.toJSON();nameplateVisibleText={left,top,right,bottom,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};break;
        }}
        samples.push({wall:performance.now(),timeMs:Number(s.dataset.timeMs||0),ready:s.dataset.ready,phase:s.dataset.phase,compact:s.dataset.compact,hasCabinet:s.dataset.hasCabinet,brand:rect(brand),title:rect(title),tag:rect(tag),titleText:title?.textContent,tagText:tag?.textContent,rim:rect(rim),cabinet:rect(cab),nameplate:plate,nameplateEvidence,nameplateTextRange,nameplateTextBox,nameplateVisibleText,skip:rect(skip),skipHit:hit===skip||skip?.contains(hit),titleOverflow:!!title&&title.scrollWidth>title.clientWidth+1,clip:getComputedStyle(document.querySelector('#startup-frame')).clipPath,brandOpacity:Number(getComputedStyle(brand).opacity),brandTransform:getComputedStyle(brand).transform,cabinetTransform:getComputedStyle(cab).transform,overlayOpacity:Number(getComputedStyle(s).opacity),overflow:document.documentElement.scrollWidth>innerWidth+2||document.documentElement.scrollHeight>innerHeight+2});
      }else if(document.body?.dataset.appReady==='true'){samples.push({done:true,wall:performance.now(),appReady:true,active:document.body.classList.contains('startup-active')});return}
      if(++count<1200)requestAnimationFrame(sample);
    }requestAnimationFrame(sample);
  })()`;
}

export async function runStartupFlow({ send, evaluate, wait, folder }) {
  const poll = async (expression, label = expression, duration = 12000) => {
    for (let t=0;t<duration;t+=20) { if(await evaluate(expression)) return; await wait(20); }
    throw Error(`Startup condition timed out: ${label}`);
  };
  const ended = () => poll("document.body.dataset.appReady==='true'&&!document.body.classList.contains('startup-active')&&!document.querySelector('#startup-screen')", 'startup fully released');
  const screenshot = async filename => { const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,filename),Buffer.from(image.data,'base64')); };
  const click = async selector => {
    const p=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)}),r=n?.getBoundingClientRect();if(!n||n.disabled||!r?.width)throw Error('Missing startup control');const x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!(h===n||n.contains(h)))throw Error('Startup control obstructed');return{x,y}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});
  };
  const backup=await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`);
  const fixtures=['empty','3v3','4v4'].map(mode=>{
    const profile=mode==='empty'?null:createLineup(mode,{id:`hc041-${mode}`,name:`启动${mode}球队`,nbaTeamId:mode==='3v3'?'BOS':'LAL'});
    profile?.players.forEach((member,index)=>Object.assign(member,{id:`hc041-${mode}-${index}`,name:`启动${mode}队员${index+1}`,number:index+11,height:'medium',build:'medium',mobility:'average'}));
    return {mode,profile,name:profile?.players[0].name||'等待入队',archive:JSON.stringify({schemaVersion:1,profiles:profile?[profile]:[],activeProfileId:profile?.id||null,playbackContext:null}),selection:JSON.stringify({templateId:mode==='4v4'?'four-out-cut':'pick-roll',frameIndex:1})};
  });
  let script=null;
  const reports=[],failures=[],controls={};
  if(process.env.HC041_CONTROLS_ONLY){const prior=JSON.parse(await readFile(path.join(folder,'hc041-startup-layouts.json'),'utf8'));reports.push(...prior.reports);failures.push(...prior.failures);}
  const recordControl=async name=>{controls[name]=true;console.log(`HC041 control ${name}: passed`);await writeFile(path.join(folder,'hc041-startup-layouts.json'),JSON.stringify({reports,failures,controls},null,2));};
  async function cold(fixture,width=390,height=844,extra='') {
    if(script){await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});script=null;}
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    const installed=await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('${archiveKey}',${JSON.stringify(fixture.archive)});localStorage.setItem('${selectionKey}',${JSON.stringify(fixture.selection)});${extra};${observerScript(fixture.name)}`});script=installed.identifier;
    await evaluate('window.__hc041OldDocument=true');await send('Page.reload');
    await poll("!window.__hc041OldDocument&&Boolean(window.__hc041Samples)&&Boolean(document.body)&&(Boolean(document.querySelector('#startup-screen'))||document.body.dataset.appReady==='true')", 'new startup document');
  }
  const raw=()=>evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`);
  function check(condition,message){if(!condition)failures.push(message);}
  try {
    await ended();
    for(const fixture of fixtures) for(const [width,height] of process.env.HC041_CONTROLS_ONLY?[]:sizes){
      await cold(fixture,width,height);
      await poll("document.querySelector('#startup-screen')?.dataset.ready==='true'",'real cabinet prepared');
      const capture=width===390||width===320||width===360&&height===400||width===844||width===1024;
      const label=`${fixture.mode}-${width}-${height}`;
      if(capture)await screenshot(`hc041-${label}-intro.png`);
      await poll("Number(document.querySelector('#startup-screen')?.dataset.timeMs)>=850||!document.querySelector('#startup-screen')",'late first-second hold');
      if(capture)await screenshot(`hc041-${label}-hold.png`);
      await poll("Number(document.querySelector('#startup-screen')?.dataset.timeMs)>=1550||!document.querySelector('#startup-screen')",'natural expansion middle');
      if(capture)await screenshot(`hc041-${label}-middle.png`);
      await ended();if(capture)await screenshot(`hc041-${label}-end.png`);
      await poll("window.__hc041Samples.some(sample=>sample.done)",'observer records the final released paint');
      const samples=await evaluate('window.__hc041Samples'),ready=samples.filter(s=>s.ready==='true'),intro=ready.find(s=>s.timeMs<200),middle=ready.find(s=>s.timeMs>=1450&&s.timeMs<1650),reveal=ready.find(s=>s.timeMs>=2100);
      check(Boolean(intro&&middle&&reveal),`${label}: natural intro/expansion/reveal all observed`);
      const hold=ready.filter(s=>s.timeMs<=1000),firstHold=hold[0],lastHold=hold.at(-1),firstExpansion=ready.find(s=>s.timeMs>=1000),done=samples.find(s=>s.done);
      const rectStable=(a,b)=>a&&b&&['x','y','width','height'].every(key=>Math.abs(a[key]-b[key])<=.05);
      const staticHold=hold.length>=12&&hold.every(s=>s.brandOpacity===1&&s.overlayOpacity===1&&s.clip===firstHold.clip&&s.brandTransform===firstHold.brandTransform&&s.cabinetTransform===firstHold.cabinetTransform&&rectStable(s.brand,firstHold.brand)&&rectStable(s.rim,firstHold.rim)&&rectStable(s.cabinet,firstHold.cabinet)&&rectStable(s.title,firstHold.title)&&rectStable(s.tag,firstHold.tag));
      const visibleHoldMs=firstExpansion&&firstHold?firstExpansion.wall-firstHold.wall:0,naturalDurationMs=done&&firstHold?done.wall-firstHold.wall:0;
      check(staticHold&&firstHold.timeMs<=50&&lastHold.timeMs>=950&&visibleHoldMs>=950,`${label}: real brand, frame clip and cabinet paint remain still and fully visible for the first 1000ms`);
      check(ready.filter(s=>s.timeMs<=1165).every(s=>s.brandOpacity===1),`${label}: title fade waits until the approved 1165ms start`);
      check(naturalDurationMs>=2350&&naturalDurationMs<=3000,`${label}: natural startup wall time ${naturalDurationMs.toFixed(1)}ms is approximately 2400ms`);
      if(intro){
        const within=r=>r&&r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=width+1&&r.bottom<=height+1;
        check(intro.titleText==='HOOPAL'&&intro.tagText==='球搭'&&!intro.titleOverflow&&within(intro.title)&&within(intro.tag),`${label}: complete readable brand text fits`);
        const b=intro.brand,r=intro.rim,gap=Math.max(r.top-b.bottom,b.top-r.bottom,r.left-b.right,b.left-r.right);
        check(gap>=12,`${label}: intro brand/frame gap ${gap.toFixed(1)}px <12px`);
        check(intro.skipHit&&within(intro.skip),`${label}: skip fits and is actually hittable`);
        check(Boolean(intro.nameplate),`${label}: actual cabinet nameplate exists in the snapshot`);
        if(intro.nameplate){const p=intro.nameplate,visibleW=Math.max(0,Math.min(p.right,r.right)-Math.max(p.left,r.left)),visibleH=Math.max(0,Math.min(p.bottom,r.bottom)-Math.max(p.top,r.top));check(visibleW>=p.width*.9&&visibleH>=p.height*.9,`${label}: nameplate clipped by initial frame`);}
        check(intro.nameplateEvidence===(fixture.profile?'HTML BUTTON':'HTML SPAN'),`${label}: camera evidence is the actual HTML plate, never jersey lettering`);
        if(intro.nameplateVisibleText){const text=intro.nameplateVisibleText,expectedHeight=Math.min(intro.nameplateTextRange.height,intro.nameplateTextBox.height),cameraHeight=Math.max(0,Math.min(text.bottom,r.bottom)-Math.max(text.top,r.top));check(text.width>0&&text.height>0&&text.height>=expectedHeight*.9&&cameraHeight>=text.height*.9,`${label}: HTML plate has visible text with complete vertical bounds (ellipsis remains allowed)`);}
      }
      check(ready.every(s=>!s.overflow),`${label}: no horizontal/full-page overflow`);
      check(ready.some(s=>s.timeMs>=2350),`${label}: naturally reaches final 2400ms reveal`);
      const released=await evaluate("({snapshots:document.querySelectorAll('[id^=startup-paint],#startup-cabinet').length,nav:[...document.querySelectorAll('[data-view-target]')].every(n=>!n.disabled),active:document.body.classList.contains('startup-active')})");
      check(released.snapshots===0&&released.nav&&!released.active,`${label}: snapshot and startup guards fully released`);
      const disk=await raw();check(hash(disk.archive)===hash(fixture.archive)&&hash(disk.selection)===hash(fixture.selection),`${label}: lineup/progress raw hashes preserved`);
      let finalLocker=null;
      if(width===360&&height===400&&fixture.profile){
        finalLocker=await evaluate(`(()=>{const card=document.querySelector('.lineup-profile-card'),bounds=card.getBoundingClientRect(),visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden],[aria-hidden="true"]'),buttons=[...card.querySelectorAll('button')].filter(n=>!n.disabled&&visible(n)).map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:n.dataset.action,rect:r.toJSON(),hit:h===n||n.contains(h)}}),text=[];const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);for(let n;n=walker.nextNode();){if(!n.textContent.trim()||!visible(n.parentElement))continue;const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();if(r.width&&r.height)text.push({text:n.textContent.trim(),rect:r.toJSON()})}return{card:bounds.toJSON(),viewport:document.querySelector('.locker-viewport').getBoundingClientRect().toJSON(),buttons,text}})()`);
        check(finalLocker.viewport.height>=70,`${label}: real final cabinet has useful height`);
        check(finalLocker.buttons.every(n=>n.hit&&n.rect.x>=-1&&n.rect.y>=-1&&n.rect.right<=width+1&&n.rect.bottom<=height+1),`${label}: all enabled final locker buttons fit and can be hit`);
        check(finalLocker.text.every(n=>n.rect.top>=finalLocker.card.top-1&&n.rect.bottom<=finalLocker.card.bottom+1),`${label}: final locker text is vertically inside the card`);
        check(finalLocker.buttons.some(n=>n.action==='lineup-player-next')&&finalLocker.buttons.filter(n=>n.action==='lineup-player-go').length===fixture.profile.players.length,`${label}: next arrow and all member dots remain available`);
      }
      reports.push({label,width,height,mode:fixture.mode,archiveHash:hash(disk.archive),selectionHash:hash(disk.selection),intro,middle,reveal,holdEvidence:{sampleCount:hold.length,firstTimeMs:firstHold?.timeMs,lastTimeMs:lastHold?.timeMs,visibleHoldMs,staticPaint:staticHold},naturalDurationMs,final:samples.at(-1),finalLocker,samples});
      const found=failures.filter(f=>f.startsWith(label));console.log(`HC041 ${label}: ${found.length?found.join('; '):'layout passed'}`);
      await writeFile(path.join(folder,'hc041-startup-layouts.json'),JSON.stringify({reports,failures,controls},null,2));
    }
    // Actual event interception and skip; after completion ordinary navigation works.
    await cold(fixtures[1]);await poll("document.querySelector('#startup-screen')?.dataset.ready==='true'",'interactive intro');
    const view=await evaluate('document.body.dataset.view');
    await evaluate("document.querySelector('[data-view-target=play]').click()");
    assert.equal(await evaluate('document.body.dataset.view'),view,'startup guard blocks background button activation');
    const point=await evaluate("(()=>{const r=document.querySelector('[data-view-target=library]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await evaluate('document.body.dataset.view'),view,'startup overlay blocks actual background touch');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.equal(await evaluate('document.activeElement.id'),'startup-skip');
    await click('#startup-skip');await ended();await click('[data-view-target=play]');await poll("document.body.dataset.view==='play'&&!document.body.dataset.pageTransition");await recordControl('skipAndBackgroundGuards');
    await wait(100);assert.equal(await evaluate("Boolean(document.querySelector('#startup-screen'))"),false);

    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await cold(fixtures[2]);await ended();assert.ok((await evaluate('window.__hc041Samples')).filter(s=>s.ready==='true').every(s=>s.timeMs===0),'reduced motion finishes without expansion');await recordControl('reduced');
    await send('Emulation.setEmulatedMedia',{features:[]});
    await cold(fixtures[1]);await poll("Number(document.querySelector('#startup-screen')?.dataset.timeMs)>=1550",'resize mid-expansion');
    await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await ended();
    const resizeSamples=await evaluate('window.__hc041Samples.filter(s=>s.ready===\'true\').map(s=>s.timeMs)');assert.ok(resizeSamples.every((t,i)=>i===0||t>=resizeSamples[i-1]),'resize remeasures without restarting the timeline');await recordControl('resizeNoReplay');

    await cold(fixtures[1]);await poll("document.querySelector('#startup-screen')?.dataset.ready==='true'",'background intro');
    await send('Emulation.setFocusEmulationEnabled',{enabled:false});
    const tab=await send('Target.createTarget',{url:'about:blank'});
    try {await send('Target.activateTarget',{targetId:tab.targetId});await poll("document.visibilityState==='hidden'",'actual background visibility');await poll("!document.body.classList.contains('startup-active')",'background ends startup');await send('Page.bringToFront');await ended();await wait(100);assert.equal(await evaluate("Boolean(document.querySelector('#startup-screen'))"),false);}
    finally{await send('Target.closeTarget',{targetId:tab.targetId});await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});}
    await recordControl('hiddenNoReplay');

    const delayed=`(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;window.__hc041DiskRead=get.bind(localStorage);window.__hc041Writes=0;Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}')window.__hc041Writes++;return set.call(this,k,v)};Storage.prototype.getItem=function(k){if(k==='${archiveKey}')return new Promise(resolve=>{window.__hc041ResolveRead=()=>resolve(get.call(this,k))});return get.call(this,k)}})()`;
    await cold(fixtures[2],390,844,delayed);await poll("typeof window.__hc041ResolveRead==='function'",'delayed real archive read');await click('#startup-skip');await wait(350);
    assert.ok(await evaluate("document.body.classList.contains('startup-active')&&document.body.dataset.appReady!=='true'&&document.querySelector('#startup-screen').dataset.ready==='false'"),'loading skip is remembered without releasing unknown state');
    assert.equal(await evaluate('window.__hc041Writes'),0);assert.equal(await evaluate(`window.__hc041DiskRead('${archiveKey}')`),fixtures[2].archive);assert.equal(await evaluate("Boolean(document.querySelector('.lineup-main-empty'))"),false);
    await evaluate('window.__hc041ResolveRead()');await ended();assert.equal(await evaluate("document.querySelector('.locker-scene').dataset.profileId"),fixtures[2].profile.id);assert.ok((await evaluate('window.__hc041Samples')).every(s=>!s.timeMs),'loading skip has no later animation');await recordControl('delayedReadSkip');

    const thrown=`(()=>{window.__hc041NativeGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='${archiveKey}')throw Error('HC041 real archive read unavailable');return window.__hc041NativeGet.call(this,k)}})()`;
    await cold(fixtures[1],390,844,thrown);await ended();assert.ok(await evaluate("Boolean(document.querySelector('.lineup-read-error'))&&!document.querySelector('.lineup-main-empty,.locker-open-empty')"));
    assert.equal(await evaluate(`window.__hc041NativeGet.call(localStorage,'${archiveKey}')`),fixtures[1].archive);assert.ok((await evaluate('window.__hc041Samples')).every(s=>!s.nameplate),'read failure never fabricates an empty cabinet');
    await evaluate('Storage.prototype.getItem=window.__hc041NativeGet');await click('[data-action=lineup-retry]');await poll("Boolean(document.querySelector('.locker-scene'))");assert.equal(await evaluate("Boolean(document.querySelector('#startup-screen'))"),false);await recordControl('readErrorRetry');

    await send('Network.setBlockedURLs',{urls:['*/assets/app-*.js']});await cold(fixtures[1]);
    await poll("document.querySelector('#startup-screen')?.dataset.phase==='error'",'fatal app chunk error');
    assert.ok(await evaluate("!document.querySelector('#startup-error').hidden&&document.querySelector('#startup-message').textContent.length>8&&document.querySelector('#startup-skip').hidden"));
    await screenshot('hc041-fatal-startup.png');await send('Network.setBlockedURLs',{urls:[]});await click('#startup-retry');await ended();await recordControl('fatalRetry');
    assert.deepEqual(await raw(),{archive:fixtures[1].archive,selection:fixtures[1].selection});
    await writeFile(path.join(folder,'hc041-startup-layouts.json'),JSON.stringify({reports,failures,controls},null,2));
    assert.deepEqual(failures,[],'startup geometry/normal completion evidence');
  } finally {
    if(script)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});
    await send('Network.setBlockedURLs',{urls:[]});await send('Emulation.setEmulatedMedia',{features:[]});
    const restore=`${backup.archive===null?`localStorage.removeItem('${archiveKey}')`:`localStorage.setItem('${archiveKey}',${JSON.stringify(backup.archive)})`};${backup.selection===null?`localStorage.removeItem('${selectionKey}')`:`localStorage.setItem('${selectionKey}',${JSON.stringify(backup.selection)})`};`;
    const installed=await send('Page.addScriptToEvaluateOnNewDocument',{source:restore});
    try{await evaluate('window.__hc041OldDocument=true');await send('Page.reload');await poll("!window.__hc041OldDocument&&document.body?.dataset.appReady==='true'",'restore original browser fixture');await ended();}
    finally{await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:installed.identifier});}
  }
}
