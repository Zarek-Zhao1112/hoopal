import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createLineup} from '../../shared/lineups.js';
import {createBrowserSession} from './browser-session.mjs';

const baselineRoot=process.argv[2],currentRoot=process.argv[3];if(!baselineRoot)throw Error('Usage: node scripts/qa/compare-layout.mjs <baseline-dist> [current-dist]');
const folder=path.resolve('artifacts/qa',`layout-parity-${Date.now()}`);await mkdir(folder,{recursive:true});
const sessions=[],report={passed:false,normalization:'Same fixtures, reduced motion, settled panels, blurred focus and dismissed transient toast. Wizard states cover existing-profile edit; creation and full animation are checked by the complete suite.',cases:[]};
const hash=source=>createHash('sha256').update(source).digest('hex');
async function imageAssets(root){const out={};async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(png|svg)$/.test(file))out[path.relative(root,file).replaceAll('\\','/')]=hash(await readFile(file))}}await walk(root);return out}
async function facts(s){return s.evaluate(`(()=>{const clean=v=>String(v).replaceAll(location.origin,'$ORIGIN');const css=n=>Object.fromEntries([...n].sort().map(k=>[k,clean(n.getPropertyValue(k))]));return [...document.body.querySelectorAll('*')].filter(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'&&Number(c.opacity)>0&&!n.closest('defs,[hidden],#toast-live')}).map(n=>{const r=n.getBoundingClientRect(),c=getComputedStyle(n),pseudos={};for(const p of ['::before','::after']){const x=getComputedStyle(n,p);if(!['none','normal'].includes(x.content))pseudos[p]=css(x)}return{tag:n.tagName,classes:n.getAttribute('class')||'',rect:[r.x,r.y,r.width,r.height].map(v=>Math.round(v*10000)/10000),text:[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent).join(''),style:css(c),pseudos,value:'value'in n?String(n.value):null,checked:'checked'in n?n.checked:null,image:n.tagName==='IMG'?{path:new URL(n.currentSrc||n.src).pathname,width:n.naturalWidth,height:n.naturalHeight}:null,svg:n.namespaceURI==='http://www.w3.org/2000/svg'?Object.fromEntries([...n.attributes].filter(a=>!['id','class'].includes(a.name)&&!a.name.startsWith('data-')).map(a=>[a.name,clean(a.value)])):null}})})()`)}
function archive(mode){
 const p=createLineup(mode,{id:'parity-'+mode,name:mode+' 同框球队',nbaTeamId:'BOS'});
 p.players.forEach((v,i)=>Object.assign(v,{id:'member-'+i,name:i===0?'队长阿明':'球员'+(i+1),number:11+i,height:i===2?'tall':'medium',build:i===2?'strong':'medium',mobility:i===1?'agile':'average',strengths:[['handling','passing'],['finishing'],['screening','passing'],['shooting']][i]}));
 return{schemaVersion:1,profiles:[p],activeProfileId:p.id,playbackContext:null};
}
async function seed(s,mode){
 if(s.seedToken)await s.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:s.seedToken});
 const selection={templateId:mode==='4v4'?'four-out-cut':'pick-roll',frameIndex:0};
 s.seedToken=(await s.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('halfcourt-lineups-v1',${JSON.stringify(JSON.stringify(archive(mode)))});localStorage.setItem('halfcourt-builtin-selection-v1',${JSON.stringify(JSON.stringify(selection))});`})).identifier;
 await s.evaluate('window.__hc043OldDocument=true');await s.send('Page.navigate',{url:s.origin});
 await s.waitFor("!window.__hc043OldDocument&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')");
}
async function click(s,selector){await s.evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Unavailable '+${JSON.stringify(selector)});n.click()})()`);await s.waitFor("!document.body.dataset.pageTransition&&document.querySelector('#lineups-panel').getAttribute('aria-busy')!=='true'")}
async function snapshot(s){await s.evaluate("(async()=>{document.activeElement?.blur();document.querySelector('#toast-live')?.classList.remove('visible');await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.complete?Promise.resolve():new Promise((resolve,reject)=>{i.addEventListener('load',resolve,{once:true});i.addEventListener('error',()=>reject(Error('Image failed: '+i.src)),{once:true})})));if([...document.images].filter(i=>i.getClientRects().length).some(i=>!i.naturalWidth))throw Error('Visible image is broken');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))})()");await s.wait(80);return(await s.send('Page.captureScreenshot',{format:'png'})).data}
async function compare(name,width,height){
 const images=[];for(const s of sessions)images.push(await snapshot(s));
 const layouts=[];for(const s of sessions)layouts.push(await facts(s));
 const delta=await sessions[1].evaluate(`(async()=>{const images=await Promise.all(${JSON.stringify(images)}.map(data=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='data:image/png;base64,'+data})));if(images.some(i=>i.width!==${width}||i.height!==${height}))throw Error('Screenshot dimensions differ from the requested viewport');const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;const context=canvas.getContext('2d');context.drawImage(images[0],0,0);const a=context.getImageData(0,0,canvas.width,canvas.height).data;context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(images[1],0,0);const b=context.getImageData(0,0,canvas.width,canvas.height).data;let pixels=0,max=0;for(let p=0;p<a.length;p+=4){let changed=false;for(let k=0;k<4;k++){const d=Math.abs(a[p+k]-b[p+k]);if(d)changed=true;max=Math.max(max,d)}if(changed)pixels++}return{width:canvas.width,height:canvas.height,pixels,max}})()`);
 let layoutFactsMatch=true;try{assert.deepEqual(layouts[0],layouts[1])}catch{layoutFactsMatch=false}
 const record={name,width,height,...delta,exactPixelMatch:delta.pixels===0,layoutFactsMatch,layoutElements:layouts.map(x=>x.length)};report.cases.push(record);
 if(!record.layoutFactsMatch){await writeFile(path.join(folder,`${width}-${height}-${name}-facts.json`),JSON.stringify(layouts,null,2))}
 if(delta.pixels||width===390&&['locker-3v3','training-3v3','wizard-3'].includes(name)){
  await writeFile(path.join(folder,`${width}-${height}-${name}-before.png`),Buffer.from(images[0],'base64'));await writeFile(path.join(folder,`${width}-${height}-${name}-after.png`),Buffer.from(images[1],'base64'));
 }
 assert.equal(record.layoutFactsMatch,true,`${name} ${width}x${height}: layout/content/paint facts differ`);
}
try{
 report.imageAssets=await imageAssets(path.resolve(baselineRoot));assert.deepEqual(await imageAssets(path.resolve(currentRoot||'dist')),report.imageAssets,'Image bytes remain identical');
 sessions.push(await createBrowserSession({rootDirectory:path.resolve(baselineRoot),name:'layout-baseline'}));sessions.push(await createBrowserSession({rootDirectory:currentRoot&&path.resolve(currentRoot),name:'layout-current'}));
 for(const s of sessions)await s.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const[width,height]of [[390,844],[360,400],[844,390],[1024,768]]){
  for(const s of sessions)await s.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  for(const mode of ['3v3','4v4']){
   for(const s of sessions)await seed(s,mode);await compare('locker-'+mode,width,height);
   for(const s of sessions)await click(s,'[data-view-target=archives]');await compare('archives-'+mode,width,height);
   for(const s of sessions)await click(s,'[data-view-target=library]');await compare('library-'+mode,width,height);
   for(const s of sessions){await click(s,'[data-view-target=play]');await s.evaluate("(()=>{const x=document.querySelector('#template-picker');if([...x.options].some(n=>n.value==='post-split')){x.value='post-split';x.dispatchEvent(new Event('change'))}})()");await s.waitFor("!document.body.classList.contains('is-loading')");await s.evaluate("(()=>{const x=document.querySelector('#timeline-scrub');x.value=333;x.dispatchEvent(new Event('input'));x.dispatchEvent(new Event('change'))})()");}
   for(const s of sessions){assert.equal(await s.evaluate("document.querySelector('#template-picker').value"),mode==='3v3'?'post-split':'four-out-cut');assert.equal(await s.evaluate("document.querySelector('#mode').value"),mode)}
   await compare('training-'+mode,width,height);
  }
  for(const s of sessions){await seed(s,'3v3');await click(s,'[data-action=lineup-recommend]')};await compare('recommendations',width,height);
  for(const s of sessions){await click(s,'[data-action=lineup-back]');await click(s,'[data-action=lineup-configure]');await s.waitFor("document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'")};
  for(const step of [1,2,3]){for(const s of sessions){await click(s,`[data-action=lineup-wizard-step][data-step="${step}"]`);await s.waitFor("document.querySelector('.lineup-sheet-content').dataset.transitioning!=='true'")};await compare('wizard-'+step,width,height)}
 }
 report.passed=true;report.allPixelsEqual=report.cases.every(x=>x.exactPixelMatch);console.log(JSON.stringify({passed:true,cases:report.cases.length,allLayoutFactsEqual:true,allPixelsEqual:report.allPixelsEqual,folder}));
}catch(error){report.failure=error.stack||String(error);console.error(report.failure);process.exitCode=1}
finally{for(const s of sessions)await s.close();report.errors=sessions.flatMap(s=>s.errors);report.remoteRequests=sessions.flatMap(s=>s.remoteRequests);if(report.errors.length||report.remoteRequests.length){report.passed=false;process.exitCode=1}await writeFile(path.join(folder,'run.json'),JSON.stringify(report,null,2));await writeFile('artifacts/qa/latest-layout-parity.json',JSON.stringify({folder,passed:report.passed,cases:report.cases.length},null,2))}
