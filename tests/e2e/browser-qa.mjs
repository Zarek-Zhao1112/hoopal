import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createBrowserSession} from '../../scripts/qa/browser-session.mjs';
import { runReadOnlyFlow } from './readonly-flow.mjs';
import { runLineupFlow } from './lineup-flow.mjs';
import { runPageMotionFlow } from './page-motion-flow.mjs';
import { runLibraryDeckFlow } from './library-deck-flow.mjs';
import { runGlassSheetFlow } from './glass-sheet-flow.mjs';
import { runPageLayoutFlow } from './page-layout-flow.mjs';
import { runTeamCarouselFlow } from './team-carousel-flow.mjs';
import { runOffenseExpansionFlow } from './offense-expansion-flow.mjs';
import { runInlinePreviewFlow } from './inline-preview-flow.mjs';
import { runArchivesFlow } from './archives-flow.mjs';
import { runCreationMotionFlow } from './creation-motion-flow.mjs';
import { runLockerFrameFlow } from './locker-frame-flow.mjs';
import { runStartupFlow } from './startup-flow.mjs';
import { runAccountCenterFlow } from './account-center-flow.mjs';

const version=JSON.parse(await readFile('package.json','utf8')).version;
const folder=path.resolve('artifacts/qa/runs',version+'-'+Date.now());
await mkdir(folder,{recursive:true});
const report={version,started:new Date().toISOString(),passed:false,groups:[],errors:[],remoteRequests:[]};
let session;
try{
 session=await createBrowserSession({name:'full-browser'});
 const {send,evaluate,wait,waitFor,origin}=session;
 report.errors=session.errors;report.remoteRequests=session.remoteRequests;
 await send('Page.navigate',{url:origin});
 await waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&Boolean(document.querySelector('#players-layer [data-player]'))");
 assert.equal(await evaluate("document.querySelectorAll('#players-layer [data-player]').length"),6);
 assert.equal(await evaluate("document.querySelectorAll('#frame-list button').length"),4);
 assert.equal(await evaluate("document.querySelectorAll('#template-picker option').length"),10);
 const context={send,evaluate,wait,waitFor,folder,downloadFolder:session.downloads};
 for(const[name,flow]of [['startup',runStartupFlow],['readonly-26-tactics',runReadOnlyFlow],['library',runLibraryDeckFlow],['page-layout',runPageLayoutFlow],['inline-loop',runInlinePreviewFlow],['expansion-recommendations',runOffenseExpansionFlow],['archives',runArchivesFlow],['creation-motion',runCreationMotionFlow],['locker-frame',runLockerFrameFlow],['team-carousel',runTeamCarouselFlow],['glass-sheet',runGlassSheetFlow],['lineups',runLineupFlow],['page-motion',runPageMotionFlow],['account-center',runAccountCenterFlow]]){
  const group={name,started:new Date().toISOString(),passed:false};report.groups.push(group);console.log('Checking '+name);
  await flow(context);group.passed=true;group.finished=new Date().toISOString();
 }
 assert.deepEqual(report.errors,[],'No browser runtime errors');assert.deepEqual(report.remoteRequests,[],'No remote app resources');report.passed=true;
 console.log('Full browser QA passed: 26 tactics, lineups, recommendation, startup, offline, export, layout and motion.');
}catch(error){report.failure=error.stack||String(error);console.error(report.failure);process.exitCode=1}
finally{
 try{await session?.close();report.tempCleaned=true}catch(error){report.cleanupError=String(error);process.exitCode=1;report.passed=false}
 report.finished=new Date().toISOString();
 await writeFile(path.join(folder,'run.json'),JSON.stringify(report,null,2));
 await writeFile('artifacts/qa/latest-browser-run.json',JSON.stringify({folder,version,passed:report.passed,groups:report.groups.map(({name,passed})=>({name,passed})),finished:report.finished},null,2));
 console.log('Browser evidence: '+folder);
}
