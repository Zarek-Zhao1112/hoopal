import {spawn} from 'node:child_process';
import {mkdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createAppServer} from '../../backend/app.mjs';

export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

/** Own one browser/profile/server. Call close in finally; no shared ports or processes. */
export async function createBrowserSession({rootDirectory,viewport={width:1440,height:1100},name='qa'}={}){
 assert.match(name,/^[a-z0-9-]+$/i,'Use a plain name for the owned temporary directory');
 const tempRoot=path.resolve('artifacts/temp');
 const tempFolder=path.join(tempRoot,`${name}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
 const profile=path.join(tempFolder,'profile'),downloads=path.join(tempFolder,'downloads');
 await mkdir(downloads,{recursive:true});
 const server=createAppServer({rootDirectory});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let launchError;browser.once('error',error=>{launchError=error});
 let socket,sequence=0,closing=false;const pending=new Map(),errors=[],remoteRequests=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`))},20000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
 });
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const waitFor=async expression=>{for(let i=0;i<300;i++){if(await evaluate(expression)&&await evaluate("!document.body?.classList.contains('startup-active')"))return;await wait(50)}throw Error(`Browser condition timed out: ${expression}`)};
 async function close(){
  if(closing)return;closing=true;
  if(socket?.readyState===1)await Promise.race([send('Browser.close').catch(()=>{}),wait(1000)]);
  socket?.close();for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Browser session closed'))}pending.clear();
  if(browser.exitCode===null){const exited=new Promise(resolve=>browser.once('exit',resolve));browser.kill();await Promise.race([exited,wait(2000)])}
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  assert.ok(tempFolder.startsWith(tempRoot+path.sep)&&path.dirname(profile)===tempFolder,'Only remove this owned QA directory');
  await rm(tempFolder,{recursive:true,force:true,maxRetries:5,retryDelay:200});
 }
 try{
  let port;for(let i=0;i<100;i++){try{port=Number((await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break}catch{if(launchError)throw launchError;if(browser.exitCode!==null)throw Error('Chrome exited before debugging was ready');await wait(50)}}
  assert.ok(port,'Dedicated dynamic Chrome port starts');
  const tabs=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'){const url=m.params.request.url;if(/^https?:/.test(url)&&!url.startsWith(origin+'/'))remoteRequests.push(url)}};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setDeviceMetricsOverride',{...viewport,deviceScaleFactor:1,mobile:viewport.width<600});await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  return{send,evaluate,wait,waitFor,origin,port,errors,remoteRequests,tempFolder,downloads,close};
 }catch(error){await close();throw error}
}
