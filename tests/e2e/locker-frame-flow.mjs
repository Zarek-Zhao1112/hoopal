import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createLineup} from '../../shared/lineups.js';

/** Compare actual border boxes, rather than only checking that controls fit. */
export async function runLockerFrameFlow({send,evaluate,wait,waitFor,folder,before=false}) {
 const key='halfcourt-lineups-v1',selectionKey='halfcourt-builtin-selection-v1',phase=before?'before':'after';
 const backup=await evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}')})`),metrics=[];
 const profiles=['3v3','4v4'].map((mode,i)=>{const p=createLineup(mode,{id:'hc036-'+mode,name:i?'四人边界验收':'三人边界验收',nbaTeamId:i?'LAL':'BOS'});p.players.forEach((m,j)=>Object.assign(m,{name:['小王','大李','阿杰','小陈'][j],number:[7,12,23,30][j],height:'medium',build:'medium',mobility:'agile',strengths:['shooting','passing'],weaknesses:[]}));return p});
 const replaceDocument=async raw=>{const injected=await send('Page.addScriptToEvaluateOnNewDocument',{source:`${raw===null?`localStorage.removeItem('${key}')`:`localStorage.setItem('${key}',${JSON.stringify(raw)})`};${backup.selection===null?`localStorage.removeItem('${selectionKey}')`:`localStorage.setItem('${selectionKey}',${JSON.stringify(backup.selection)})`};window.__hc036Ready=true`});try{await evaluate('window.__hc036Ready=false');await send('Page.reload');await waitFor("window.__hc036Ready===true&&document.readyState==='complete'&&Boolean(document.querySelector('#players-layer [data-player]'))&&Boolean(document.querySelector('#lineups-panel>*'))")}finally{await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier})}};
 const facts=()=>evaluate(`({archive:localStorage.getItem('${key}'),selection:localStorage.getItem('${selectionKey}'),play:document.querySelector('#play-title').value,template:document.querySelector('#template-picker').value,frame:document.querySelector('#timeline-scrub').value,players:document.querySelector('#players-layer').innerHTML})`);
 const click=async selector=>{const p=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)});return{x,y}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1})};
 const nav=async view=>{await click(`[data-view-target=${view}]`);await waitFor(`document.body.dataset.view==='${view}'&&!document.body.dataset.pageTransition`)};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(r.data,'base64'))};
 try{
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const state of ['empty','3v3','4v4']){
   const raw=JSON.stringify({schemaVersion:1,profiles:state==='empty'?[]:profiles,activeProfileId:state==='empty'?null:profiles.find(p=>p.mode===state).id,playbackContext:null});await replaceDocument(raw);const original=await facts();
   for(const [width,height]of[[360,640],[390,844],[393,819],[640,360],[844,390],[1024,768],[1280,800],[1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});await wait(70);const frames=[];
    for(const view of ['lineups','play','library','archives']){
     await nav(view);
     const m=await evaluate(`(()=>{const view=document.body.dataset.view,selector=view==='lineups'?'.lineups-panel>.lineup-main-empty,.lineups-panel>.lineup-profile-card':view==='play'?'.training-panel':view==='library'?'.library-deck-panel':'.lineup-archives-card',c=document.querySelector(selector),r=c.getBoundingClientRect(),nav=document.querySelector('.view-nav').getBoundingClientRect(),b=document.querySelector('#lineup-brand-header');return{state:${JSON.stringify(state)},view,width:innerWidth,height:innerHeight,box:r.toJSON(),nav:nav.toJSON(),brand:b.getClientRects().length>0,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,controls:[...c.querySelectorAll('button,input,select,label.toggle-label,label.loop-label')].filter(n=>!n.disabled&&!n.matches('input[type=checkbox]')&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{action:n.dataset.action||n.id||n.className,fit:r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:h===n||n.contains(h)}})}})()`);
     if(!before){assert.ok(m.sw<=width+1&&m.sh<=height+1,'no page scroll '+JSON.stringify(m));assert.equal(m.brand,view==='lineups');for(const control of m.controls)assert.ok(control.fit&&control.hit,`${width}x${height}/${state}/${view} `+JSON.stringify(control));assert.ok(m.box.bottom<=m.nav.y+1,'card stays above navigation')}
     frames.push(m);metrics.push(m);if(width===390||width===1024||width===640)await shot(`hc036-${phase}-${width}x${height}-${state}-${view}.png`);
    }
    if(!before)for(const m of frames.slice(1))for(const k of['x','y','width','height'])assert.ok(Math.abs(m.box[k]-frames[0].box[k])<=1,`${width}x${height}/${state} locker ${k} differs from ${m.view}: ${frames[0].box[k]} vs ${m.box[k]}`);
    assert.deepEqual(await facts(),original,'navigation and resize preserve archives, source and main play');
   }
  }
  await writeFile(path.join(folder,`hc036-${phase}-frames.json`),JSON.stringify({phase,metrics,storageAndPlayUnchanged:true},null,2));console.log(JSON.stringify({phase,frames:metrics.length,states:3,sizes:8,storageAndPlayUnchanged:true}));
 }finally{await replaceDocument(backup.archive);await send('Emulation.setEmulatedMedia',{features:[]})}
}
