import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {navigateLineupView,openArchiveMenu} from './archive-helpers.mjs';
import {waitForWizardMotion} from './wizard-helpers.mjs';

export async function runGlassSheetFlow({send,evaluate,wait,waitFor,folder}) {
 const key='halfcourt-lineups-v1',dialog='#lineup-wizard-dialog';
 const saved=await evaluate(`localStorage.getItem('${key}')`);
 const action=async(name,extra='')=>{await evaluate(`(()=>{const n=document.querySelector('[data-action="${name}"]${extra}');if(!n)throw Error('missing ${name}');n.click();})()`);await waitForWizardMotion({waitFor})};
 const input=(name,value)=>evaluate(`(()=>{const n=document.querySelector('[data-action="${name}"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 const shot=async name=>{const p=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(p.data,'base64'));};
 const closed=()=>waitFor(`!document.querySelector('${dialog}').open`);
 const motion=[];
 try {
  await navigateLineupView({evaluate,waitFor},'archives');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(100);
  await action('lineup-create-empty');
  for(const delay of [90,150,300]){await wait(delay);motion.push(await evaluate(`(()=>{const p=document.querySelector('${dialog} .lineup-glass-sheet');return{top:p.getBoundingClientRect().top,transform:getComputedStyle(p).transform,filter:getComputedStyle(document.querySelector('.workspace')).filter,animations:document.getAnimations().map(a=>a.effect?.getTiming().duration)};})()`));}
  assert.ok(motion[0].top>motion.at(-1).top+5,'real panel visibly rises');assert.ok(motion[0].animations.includes(450));
  assert.ok(await evaluate("[...document.querySelectorAll('[data-view-target]')].every(n=>n.disabled)"),'modal locks navigation');
  await evaluate("document.querySelector('[data-view-target=play]').click()");assert.equal(await evaluate('document.body.dataset.view'),'archives');
  await input('lineup-name','完整创建与重试');await action('lineup-mode','[data-value="4v4"]');await action('lineup-wizard-next');
  assert.equal(await evaluate(`localStorage.getItem('${key}')`),saved,'first step does not create blank archive');
  await action('lineup-carousel-all-open');
  while(await evaluate("!document.querySelector('[data-action=lineup-team-page-prev]').disabled"))await action('lineup-team-page-prev');
  await action('lineup-team-option','[data-team-id=BOS]');await action('lineup-wizard-next');
  assert.equal(await evaluate(`localStorage.getItem('${key}')`),saved,'second step is draft only');
  const ids=await evaluate("[...document.querySelectorAll('#lineup-wizard-dialog [data-action=lineup-player]')].map(n=>n.dataset.playerId)");assert.equal(ids.length,4);
  for(let i=0;i<4;i++){
   await action('lineup-player',`[data-index="${i}"]`);await action('lineup-edit-section','[data-section=identity]');await input('lineup-player-name','新队员'+(i+1));await input('lineup-player-number',i+11);await action('lineup-edit-section','[data-section=traits]');
   for(const [trait,value] of [['height','medium'],['build','medium'],['mobility','average']])await action('lineup-trait-'+trait,`[data-value=${value}]`);
  }
  await action('lineup-wizard-step','[data-step="1"]');await action('lineup-mode','[data-value="3v3"]');await action('lineup-mode','[data-value="4v4"]');await action('lineup-wizard-step','[data-step="3"]');await action('lineup-player','[data-index="3"]');await action('lineup-edit-section','[data-section=identity]');assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-name]').value"),'新队员4','mode roundtrip keeps fourth member');
  await evaluate(`(()=>{window.hc021OriginalSetItem=Storage.prototype.setItem;window.hc021Attempts=0;Storage.prototype.setItem=function(k,v){if(k==='${key}'){window.hc021Attempts++;throw Error('HC021 simulated write failure');}return window.hc021OriginalSetItem.call(this,k,v)};})()`);
  await action('lineup-create-save');await waitFor("document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&document.querySelector('.lineup-wizard-error').textContent.includes('HC021')");
  assert.equal(await evaluate(`localStorage.getItem('${key}')`),saved,'failed final save never leaves an empty profile');assert.ok(await evaluate(`document.querySelector('${dialog}').open`));
  const retainedIds=await evaluate("[...document.querySelectorAll('#lineup-wizard-dialog [data-action=lineup-player]')].map(n=>n.dataset.playerId)");assert.deepEqual(retainedIds,ids);
  await shot('hc021-save-failure.png');
  await evaluate('Storage.prototype.setItem=window.hc021OriginalSetItem');
  await evaluate("document.querySelector('[data-action=lineup-create-save]').click();document.querySelector('[data-action=lineup-create-save]')?.click()");await closed();
  await waitFor("document.body.dataset.view==='lineups'&&!document.body.dataset.pageTransition");
  const archive=await evaluate(`JSON.parse(localStorage.getItem('${key}'))`),p=archive.profiles.find(p=>p.name==='完整创建与重试');assert.equal(archive.profiles.length,(saved?JSON.parse(saved).profiles.length:0)+1);assert.equal(p.players.length,4);assert.deepEqual(p.players.map(p=>p.id),ids);assert.ok(p.players.every(p=>p.height&&p.build&&p.mobility));
  await action('lineup-configure');await wait(520);await input('lineup-player-name','未保存且可保留');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.ok(await evaluate("Boolean(document.querySelector('#lineup-wizard-dialog [data-action=lineup-draft-keep]'))"));await action('lineup-draft-keep');await closed();await action('lineup-configure');await wait(520);assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-name]').value"),'未保存且可保留');
  await action('lineup-wizard-close');await action('lineup-draft-discard');await closed();
  await action('lineup-configure');await wait(520);
  const rapidClose=await evaluate("(()=>{const d=document.querySelector('#lineup-wizard-dialog'),old=[...d.querySelectorAll('[data-action=lineup-player],[data-action=lineup-edit-section],[data-action=lineup-save]')];d.querySelector('[data-action=lineup-wizard-close]').click();old.forEach(n=>n.click());return{phase:d.dataset.phase,disabled:old.every(n=>n.disabled)};})()");
  assert.equal(rapidClose.phase,'closing');assert.equal(rapidClose.disabled,true);await closed();
  assert.equal(await evaluate('document.activeElement.dataset.action'),'lineup-configure','close restores rebuilt configure trigger');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('${key}')).profiles.find(p=>p.id===${JSON.stringify(p.id)}).revision`),1,'clicks during close neither save nor mutate profile');
  const focusReturn=[];
  for(const trigger of ['lineup-create','lineup-configure','lineup-archive-rename']){
    if(trigger==='lineup-archive-rename')await openArchiveMenu({evaluate,waitFor},p.id);
    else await navigateLineupView({evaluate,waitFor},trigger==='lineup-create'?'archives':'lineups');
    await evaluate(`(()=>{const n=document.querySelector('[data-action=${trigger}]');n.focus();n.click();})()`);await wait(520);await action('lineup-wizard-close');
    if(trigger==='lineup-create')await action('lineup-draft-discard');await closed();const returned=await evaluate('document.activeElement.dataset.action');assert.equal(returned,trigger==='lineup-archive-rename'?'lineup-archive-menu':trigger,'focus returns to the visible trigger for '+trigger);focusReturn.push({trigger,returned});
  }
  assert.ok(await evaluate("document.querySelector('.lineup-brand-icon').complete&&document.querySelector('.lineup-brand-icon').naturalWidth>0"),'real bundled brand icon loads over HTTP');
  await writeFile(path.join(folder,'hc021-glass-flow.json'),JSON.stringify({motion,createdProfile:p.id,memberIds:ids,failedWritePreservedDisk:true,modeRoundtrip:true,oneCompleteArchive:true,escapeDraftConfirmation:true,sessionDraftKept:true,rapidClose,focusReturn},null,2));
 } finally {
  await evaluate(`(()=>{if(window.hc021OriginalSetItem)Storage.prototype.setItem=window.hc021OriginalSetItem;${saved===null?`localStorage.removeItem('${key}')`:`localStorage.setItem('${key}',${JSON.stringify(saved)})`};})()`);
  await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-open-archives],[data-action=lineup-configure]'))");
 }
}
