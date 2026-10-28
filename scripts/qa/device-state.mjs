import {execFileSync,spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

const[phase,serial,output]=process.argv.slice(2);
if(!['before','after'].includes(phase)||!serial||!output)throw Error('Usage: node scripts/qa/device-state.mjs before|after <serial> <report-directory>');
assert.match(serial,/^[a-zA-Z0-9._:-]+$/);
const folder=path.resolve(output),qaRoot=path.resolve('artifacts/qa');assert.ok(folder.startsWith(qaRoot+path.sep),'Device evidence stays in QA artifacts');await mkdir(folder,{recursive:true});
const pkg=JSON.parse(await readFile('capacitor.config.json','utf8')).appId;
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||path.resolve('.tools/android-sdk');
const adb=path.join(sdk,'platform-tools',process.platform==='win32'?'adb.exe':'adb');
const run=(args,binary=false)=>execFileSync(adb,['-s',serial,...args],{encoding:binary?undefined:'utf8',windowsHide:true,maxBuffer:16777216});
assert.equal(run(['get-state']).trim(),'device');
const raw=run(['shell','run-as',pkg,'cat','files/halfcourt/storage/halfcourt-lineups-v1.txt']);
const selection=run(['shell','run-as',pkg,'cat','files/halfcourt/storage/halfcourt-builtin-selection-v1.txt']);
const sha=text=>createHash('sha256').update(text).digest('hex');
const info=run(['shell','dumpsys','package',pkg]);
const result={serial,packageId:pkg,model:run(['shell','getprop','ro.product.model']).trim(),phase,checkedAt:new Date().toISOString(),count:JSON.parse(raw).profiles.length,sha256:sha(raw),selectionSha256:sha(selection),version:info.match(/versionName=([^\s]+)/)?.[1],versionCode:Number(info.match(/versionCode=(\d+)/)?.[1])};
if(phase==='before'){
 const pid=spawnSync(adb,['-s',serial,'shell','pidof',pkg],{encoding:'utf8',windowsHide:true}).stdout?.trim().split(/\s+/)[0];
 result.editing=false;
 if(pid){
  const port=run(['forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`]).trim();let socket;
  try{
   const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json(),tab=tabs.find(t=>t.type==='page'&&t.url.startsWith('https://localhost'));assert.ok(tab);
   socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
   const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preflight timeout')),8000);socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1){clearTimeout(timer);m.error?reject(Error(m.error.message)):resolve(m.result.result.value)}}});
   socket.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:"({view:document.body.dataset.view,editing:Boolean(document.querySelector('#lineup-wizard-dialog[open]')),retainedDraftIndicator:[...document.querySelectorAll('[data-action=lineup-create],[data-action=lineup-create-empty],[data-action=lineup-configure]')].some(n=>/继续创建|继续未保存/.test(n.textContent)),busy:document.body.classList.contains('is-loading')||document.querySelector('#lineups-panel')?.getAttribute('aria-busy')==='true'})",returnByValue:true}}));Object.assign(result,await response);
  }finally{socket?.close();run(['forward','--remove',`tcp:${port}`])}
 }
 result.draftCheckScope='Open wizard and currently rendered retained-draft indicators; not a proof that all closed in-memory session drafts are absent.';
 assert.equal(result.editing,false,'Do not interrupt an open lineup wizard');assert.notEqual(result.retainedDraftIndicator,true,'Retained draft is indicated in the current UI; finish or discard it before installing');assert.notEqual(result.busy,true,'Wait for the ongoing app operation before installing');
 await writeFile(path.join(folder,'lineups-backup.json'),raw);await writeFile(path.join(folder,'selection-backup.json'),selection);
}else{
 const before=JSON.parse(await readFile(path.join(folder,'device-before.json'),'utf8'));assert.equal(result.model,before.model);assert.equal(result.sha256,before.sha256);assert.equal(result.selectionSha256,before.selectionSha256);
 const version=JSON.parse(await readFile('package.json','utf8')).version,gradle=await readFile('android/app/build.gradle','utf8');assert.equal(result.version,version);assert.equal(result.versionCode,Number(gradle.match(/versionCode\s+(\d+)/)[1]));
 const foreground=()=>run(['shell','dumpsys','window']).split('\n').find(l=>l.includes('mCurrentFocus='))||'';assert.ok(foreground().includes(pkg));const png=run(['exec-out','screencap','-p'],true);assert.ok(foreground().includes(pkg));await writeFile(path.join(folder,'device-after.png'),png);result.foregroundVerified=true;result.lineupsAndSelectionUnchanged=true;
}
await writeFile(path.join(folder,`device-${phase}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
