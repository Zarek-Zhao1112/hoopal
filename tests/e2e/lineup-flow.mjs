import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createLineup} from '../../shared/lineups.js';
import {NBA_TEAMS} from '../../data/nba-teams.js';
import {findLibraryCard} from './library-deck-helpers.mjs';
import {beginArchiveCreate,selectArchive,openArchiveMenu} from './archive-helpers.mjs';
import {waitForWizardMotion} from './wizard-helpers.mjs';

export async function runLineupFlow({send,evaluate,wait,waitFor,folder}) {
  const action=async(id,extra='')=>{await evaluate(`(()=>{const b=document.querySelector('[data-action="${id}"]${extra}');if(!b)throw Error('missing ${id}');b.click()})()`);await waitForWizardMotion({waitFor})};
  const nav=async view=>{await evaluate(`document.querySelector('[data-view-target=${view}]').click()`);if(!await evaluate("Boolean(document.querySelector('dialog[open]'))"))await waitFor(`document.body.dataset.view===${JSON.stringify(view)}&&!document.body.dataset.pageTransition`)};
  const input=async(id,value)=>evaluate(`(()=>{let n=document.querySelector('[data-action="${id}"]');n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  const disk="JSON.parse(localStorage.getItem('halfcourt-lineups-v1'))";
  const modalStable=async()=>{await waitFor("(()=>{const d=document.querySelector('#lineup-wizard-dialog');return !d?.open||d.dataset.phase==='open'})()");await wait(40)};
  const openWizard=async(actionId='lineup-configure')=>{await action(actionId);await waitFor("document.querySelector('#lineup-wizard-dialog')?.open&&document.querySelector('#lineup-wizard-dialog').dataset.phase==='open'");await wait(40)};
  const beginCreate=async()=>{await beginArchiveCreate({evaluate,waitFor});await wait(40)};
  const step=async number=>{await action('lineup-wizard-step',`[data-step="${number}"]`);assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"),String(number))};
  const closeWizard=async(choice='discard')=>{
    await action('lineup-wizard-close');
    if(await evaluate("Boolean(document.querySelector('#lineup-wizard-dialog [data-action=lineup-draft-continue]'))"))await action(`lineup-draft-${choice}`);
    await waitFor("!document.querySelector('#lineup-wizard-dialog').open");await wait(40);
  };
  const chooseTeam=async team=>{
    await action('lineup-carousel-all-open');
    while(await evaluate("!document.querySelector('[data-action=lineup-team-page-prev]').disabled"))await action('lineup-team-page-prev');
    for(let page=0;page<3;page++){
      if(await evaluate(`Boolean(document.querySelector('[data-action="lineup-team-option"][data-team-id="${team}"]'))`))break;
      await action('lineup-team-page-next');
    }
    await action('lineup-team-option',`[data-team-id="${team}"]`);
    assert.equal(await evaluate("document.querySelector('.lineup-team-carousel').dataset.allOpen"),'false');
    assert.equal(await evaluate("document.querySelector('.carousel-stage').dataset.teamId"),team);
    assert.equal(await evaluate("document.querySelector('.lineup-wizard-kit .lineup-jersey').dataset.teamId"),team);
  };
  const create=async(mode,name)=>{
    const before=await evaluate("localStorage.getItem('halfcourt-lineups-v1')");
    await beginCreate();await input('lineup-name',name);
    await action('lineup-mode',`[data-value="${mode}"]`);
    assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),before,'task one does not create an empty archive');
    await action('lineup-wizard-next');
    assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"),'2');
    await action('lineup-wizard-next');
    assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"),'2','new profile requires explicit NBA team choice');
    await chooseTeam(mode==='3v3'?'BOS':'LAL');
    assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),before,'NBA selection remains a draft');
    await action('lineup-wizard-next');
    assert.equal(await evaluate("document.querySelector('.lineup-glass-sheet').dataset.step"),'3');
    // Final submission still refuses an incomplete roster and does not persist it.
    await action('lineup-create-save');
    assert.equal(await evaluate("document.querySelector('#lineup-wizard-dialog').open"),true);
    assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),before,'incomplete members never leave a preliminary archive');
    await evaluate(`window.creationDiskBefore=${JSON.stringify(before)};window.creationWrites=[];window.creationSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='halfcourt-lineups-v1')window.creationWrites.push(JSON.parse(value));return window.creationSetItem.call(this,key,value)}`);
  };
  const configure=async(count)=>{
    const kind=await evaluate("document.querySelector('.lineup-glass-sheet').dataset.kind");
    await step(3);
    for(let i=0;i<count;i++) {
      await action('lineup-player',`[data-index="${i}"]`);
      await action('lineup-edit-section','[data-section="identity"]');
      await input('lineup-player-name',['小王','大李','阿杰','小陈'][i]);
      await input('lineup-player-number',[7,12,23,30][i]);
      await action('lineup-edit-section','[data-section="traits"]');
      for(const [key,value] of [['height',i===1?'tall':'medium'],['build',i===1?'strong':'medium'],['mobility',i===1?'average':'agile']]) await action(`lineup-trait-${key}`,`[data-value="${value}"]`);
      await action('lineup-edit-section','[data-section="strengths"]');
      for(const skill of [['shooting','handling','passing'],['screening','finishing'],['driving','passing'],['shooting','passing']][i])await action('lineup-strengths',`[data-value="${skill}"]`);
    }
    const memberIds=await evaluate("[...document.querySelectorAll('#lineup-wizard-dialog [data-action=lineup-player]')].map(n=>n.dataset.playerId)");
    if(kind==='create')assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),await evaluate('window.creationDiskBefore'),'member tasks remain entirely in memory');
    await action(kind==='create'?'lineup-create-save':'lineup-save');
    await waitFor("document.body.dataset.view==='lineups'&&document.querySelector('#lineups-panel').dataset.subview==='profiles'&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&!document.querySelector('#lineup-wizard-dialog').open&&!document.body.dataset.pageTransition");
    if(kind==='create'){
      assert.equal(await evaluate('window.creationWrites.length'),1,'one complete creation write, with no empty-then-update sequence');
      const saved=await evaluate(`${disk}.profiles.find(p=>p.id===${disk}.activeProfileId)`);
      assert.deepEqual(saved.players.map(player=>player.id),memberIds,'draft member identity survives final save');
      assert.ok(saved.players.every(player=>player.height&&player.build&&player.mobility));
      await evaluate('Storage.prototype.setItem=window.creationSetItem;delete window.creationSetItem;delete window.creationWrites;delete window.creationDiskBefore');
    }
    await wait(40);
  };
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await create('3v3','周末三人组');
  await configure(3);
  assert.equal(await evaluate(`${disk}.profiles[0].nbaTeamId`),'BOS');
  await action('lineup-player-next');
  await screenshot('nba-locker-BOS-phone.png');
  await action('lineup-player-prev');
  await checkNbaDrafts();
  await screenshot('hc010-before-gesture.png');
  await checkLockerInteraction(3);
  await screenshot('manager-roster-3v3-phone.png');
  assert.equal(await evaluate(`${disk}.profiles.length`),1);
  assert.deepEqual(await evaluate(`Object.keys(${disk}).sort()`),['activeProfileId','playbackContext','profiles','schemaVersion']);
  await openWizard();
  await action('lineup-edit-section','[data-section="weaknesses"]');
  await action('lineup-weaknesses','[data-value="shooting"]');
  assert.ok(await evaluate("document.querySelector('.lineup-wizard-error').textContent.includes('不能同时')"));
  await action('lineup-edit-section','[data-section="identity"]');
  await input('lineup-player-name','保留的草稿');
  await nav('play');await nav('lineups');
  assert.equal(await evaluate('document.body.dataset.view'),'lineups','modal blocks background navigation');
  assert.equal(await evaluate("document.querySelector('#lineup-wizard-dialog').open"),true);
  assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-name]').value"),'保留的草稿');
  await closeWizard('keep');
  await nav('play');await nav('lineups');
  await beginCreate();await input('lineup-name','待放弃的新队');await closeWizard('discard');
  await nav('lineups');
  await openWizard();assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-name]').value"),'保留的草稿');
  await closeWizard('discard');
  await action('lineup-recommend');
  assert.equal(await evaluate("document.querySelectorAll('[data-action=lineup-candidate]').length"),3);
  assert.ok(!await evaluate("/recommended|conditional/.test(document.querySelector('.lineup-fit').textContent)"));
  for(const section of ['summary','reasons','assignments','cautions']) {
    await action('lineup-detail',`[data-section="${section}"]`);
    assert.ok(await evaluate("document.querySelector('.lineup-recommendation-detail').textContent.length>0"));
  }
  await action('lineup-play');
  await waitFor("document.body.dataset.view==='play'&&Boolean(document.body.dataset.lineupContext)&&!document.body.classList.contains('is-loading')");
  assert.equal(await evaluate("document.querySelector('#lineup-legend').hidden"),false);
  const template=await evaluate("document.querySelector('#template-picker').value");
  const context=await evaluate(`${disk}.playbackContext`);
  assert.equal(context.templateId,template);
  assert.ok(await evaluate("document.querySelector('#lineup-legend').textContent.includes('球衣')"));
  assert.equal(await evaluate("[...document.querySelectorAll('#players-layer [data-player^=\"attack-\"] text')].map(p=>p.textContent).join(',')"),'1,2,3');
  await evaluate("document.querySelector('#restart-play').click()");
  await waitFor("Number(document.querySelector('#timeline-scrub').value)>1");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
  assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')"),'false','Escape pauses playback without navigating hidden lineup pages');
  assert.equal(await evaluate("document.querySelector('#lineups-panel').dataset.subview"),'recommendations');
  await send('Page.reload');await waitFor("Boolean(document.body.dataset.lineupContext)&&Boolean(document.querySelector('[data-player]'))");
  assert.equal(await evaluate(`${disk}.profiles.length`),1);
  await nav('play');
  // The same ID is crucial: source equality alone cannot distinguish a plain
  // library launch from a recommended launch, especially after write failure.
  await nav('library');await waitFor('!document.body.dataset.pageTransition');
  await findLibraryCard({evaluate,waitFor},template);
  await evaluate(`document.querySelector('.library-card-heading[data-template-id="${template}"]').click()`);
  assert.equal(await evaluate("document.body.dataset.lineupContext"),context.profileId,'previewing the same tactic retains recommendation identity');
  await evaluate("window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='halfcourt-lineups-v1'&&JSON.parse(v).playbackContext===null)throw Error('simulated clear failure');return window.savedSet.call(this,k,v)}");
  await evaluate(`document.querySelector('[data-play-template="${template}"]').click()`);
  await waitFor("!document.body.classList.contains('is-loading')");
  assert.equal(await evaluate("document.body.dataset.lineupContext"),context.profileId,'failed plain transition preserves original recommended session');
  assert.equal(await evaluate('document.body.dataset.view'),'library','clear failure cannot navigate or start playback');
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),template,'failed source clear retains expanded card for retry');
  await evaluate("Storage.prototype.setItem=window.savedSet");
  await evaluate(`document.querySelector('[data-play-template="${template}"]').click()`);
  await waitFor("!document.body.classList.contains('is-loading')&&!document.body.dataset.lineupContext");
  await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'");
  await evaluate("document.querySelector('#play-toggle').click()");
  await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-player]'))");
  assert.equal(await evaluate("document.body.dataset.lineupContext"),'');
  await nav('lineups');
  await create('4v4','公司四人队');await configure(4);
  await checkLockerInteraction(4);
  assert.equal(await evaluate(`${disk}.profiles.length`),2);
  await action('lineup-recommend');await action('lineup-play');
  await waitFor("document.body.dataset.view==='play'&&Boolean(document.body.dataset.lineupContext)");
  assert.equal(await evaluate("document.querySelector('#mode').value"),'4v4');
  const seen=[];
  for(let i=0;i<2;i++){seen.push(...await evaluate("[...document.querySelectorAll('.legend-row')].map(n=>n.dataset.role)"));if(i===0)await evaluate("document.querySelector('#legend-next').click()")}
  assert.deepEqual(seen,['1','2','3','4']);
  for(const [width,height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    for(const view of ['play','library','archives','lineups']) {
      await nav(view);await wait(40);await checkLayout(width,height,`${view} base`);
      if(view!=='lineups')await screenshot(`manager-${view}-${width}-${height}.png`);
    }
    if(await evaluate("document.querySelector('#lineups-panel').dataset.subview!=='profiles'")) await action('lineup-back');
    await openWizard();
    for(const section of ['identity','traits','strengths','weaknesses']){await action('lineup-edit-section',`[data-section="${section}"]`);await checkLayout(width,height,`editor ${section}`)}
    if(width===390)await screenshot('lineup-configure-phone.png');
    await step(1);await checkLayout(width,height,'editor team basics');
    assert.ok(await evaluate("[...document.querySelectorAll('#lineup-wizard-dialog [data-action=lineup-mode]')].every(n=>n.disabled)"),'saved roster size cannot silently change');
    await step(2);
    await action('lineup-carousel-all-open');
    while(await evaluate("!document.querySelector('[data-action=lineup-team-page-prev]').disabled"))await action('lineup-team-page-prev');
    const teams=[];
    for(let page=0;page<3;page++){
      await waitFor("[...document.querySelectorAll('[data-action=lineup-team-option] img')].every(n=>n.complete&&n.naturalWidth>0)");
      teams.push(...await evaluate("[...document.querySelectorAll('[data-action=lineup-team-option]')].map(n=>n.dataset.teamId)"));
      await checkLayout(width,height,`NBA page ${page+1}`);
      if(width===390)await screenshot(`nba-team-picker-phone-page-${page+1}.png`);
      if(page<2)await action('lineup-team-page-next');
    }
    assert.deepEqual(teams.sort(),NBA_TEAMS.map(team=>team.id).sort(),'all 30 teams and official logos are reachable');
    await action('lineup-carousel-all-close');
    await closeWizard('discard');
    await action('lineup-recommend');
    for(const section of ['summary','reasons','assignments','cautions']) {
      await action('lineup-detail',`[data-section="${section}"]`);
      const visited=[];let more=true;
      while(more){visited.push(await evaluate("document.querySelector('.lineup-recommendation-detail').textContent"));await checkLayout(width,height,`recommendation ${section}`);more=await evaluate("!document.querySelector('[data-action=lineup-detail-next]').disabled");if(more)await action('lineup-detail-next')}
      assert.ok(visited.length>0);
    }
    if(width===390)await screenshot('lineup-recommend-phone.png');
    await action('lineup-back');
    await checkRoster(width,height,4);
    await screenshot(`manager-roster-4v4-${width}-${height}.png`);
    if(width===390)await screenshot('lineup-profiles-phone.png');
    await beginCreate();await checkLayout(width,height,'create');await closeWizard('discard');
  }
  // The archive and long-name limits use real valid data, then UI paging.
  const extras=Array.from({length:18},(_,i)=>createLineup(i%2?'3v3':'4v4',{name:i===17?'长名称'.repeat(13):`备用阵容 ${i+1}`}));
  extras.at(-1).players[0].name='<img src=x>';
  await evaluate(`(()=>{const s=${disk};s.profiles.push(...${JSON.stringify(extras)});localStorage.setItem('halfcourt-lineups-v1',JSON.stringify(s))})()`);
  await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-configure]'))");
  await nav('archives');const names=[];
  for(let page=0;page<7;page++){names.push(...await evaluate("[...document.querySelectorAll('.lineup-archive-card')].map(n=>n.dataset.profileId)"));if(page<6)await action('lineup-archives-next')}
  assert.equal(new Set(names).size,20);assert.equal(await evaluate("document.querySelector('[data-action=lineup-create]').disabled"),true);
  assert.ok(!await evaluate("Boolean(document.querySelector('#lineups-panel img[src=x]'))"),'names are text, never injected HTML');
  const deletedId=extras.at(-1).id;await openArchiveMenu({evaluate,waitFor},deletedId);
  await action('lineup-delete');await action('lineup-delete-cancel');assert.equal(await evaluate(`${disk}.profiles.length`),20);
  await openArchiveMenu({evaluate,waitFor},deletedId);await action('lineup-delete');await action('lineup-delete-confirm');await waitFor(`${disk}.profiles.length===19`);
  assert.equal(await evaluate("document.querySelector('[data-action=lineup-create]').disabled"),false);
  assert.equal(await evaluate("localStorage.getItem('halfcourt-library-v1')"),'[]');
  assert.deepEqual(await evaluate("Object.keys(JSON.parse(localStorage.getItem('halfcourt-builtin-selection-v1'))).sort()"),['frameIndex','templateId']);
  const longName='长'.repeat(10)+'🏀'.repeat(7),longTeam='阵容'.repeat(20);
  await evaluate(`(()=>{let s=${disk},p=s.profiles.find(p=>p.id===s.activeProfileId);p.name=${JSON.stringify(longTeam)};p.players[0].name=${JSON.stringify(longName)};p.players[1].name=${JSON.stringify('队员\n带换行昵称')};p.revision++;s.playbackContext=null;localStorage.setItem('halfcourt-lineups-v1',JSON.stringify(s))})()`);
  await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-configure]'))");
  await action('lineup-recommend');
  for(const [width,height] of [[360,640],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    for(const section of ['reasons','assignments','cautions']) {
      await action('lineup-detail',`[data-section="${section}"]`);
      for(let i=0;i<50;i++){await checkLayout(width,height,`long names ${section}`);if(await evaluate("document.querySelector('[data-action=lineup-detail-next]').disabled"))break;await action('lineup-detail-next')}
    }
  }
  await action('lineup-play');await waitFor("document.body.dataset.view==='play'&&Boolean(document.body.dataset.lineupContext)");
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:1,mobile:true});
  await checkLayout(360,640,'long team legend');
  const rowTitle=await evaluate("document.querySelector('.legend-row').title");
  await tap('.legend-row');await waitFor("document.querySelector('#note-dialog').open");
  const note=[];for(let i=0;i<20;i++){note.push(await evaluate("document.querySelector('#note-preview').textContent"));assert.ok(await evaluate("document.querySelector('#note-preview').scrollHeight<=document.querySelector('#note-preview').clientHeight"));if(await evaluate("document.querySelector('#note-page-next').disabled"))break;await evaluate("document.querySelector('#note-page-next').click()")}
  assert.equal(note.join(''),rowTitle);await evaluate("document.querySelector('#close-note').click()");
  await nav('lineups');await action('lineup-back');await openWizard();
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:540,deviceScaleFactor:1,mobile:true});
  await tap('[data-action=lineup-edit-section][data-section=traits]');
  await tap('[data-action=lineup-trait-height][data-value=short]');
  assert.equal(await evaluate("document.querySelector('[data-action=lineup-trait-height][data-value=short]').getAttribute('aria-pressed')"),'true');
  await action('lineup-edit-section','[data-section="identity"]');
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:400,deviceScaleFactor:1,mobile:true});
  await tap('[data-action=lineup-player-name]');
  assert.equal(await evaluate("document.activeElement.dataset.action"),'lineup-player-name');
  await checkLayout(360,400,'input focus with reduced viewport');
  await evaluate('document.activeElement.blur()');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await closeWizard('discard');
  // Legacy archive fixture has no NBA selection; no silent default or member loss.
  const beforeLegacy=await evaluate(`(()=>{let s=${disk};s.profiles.forEach(p=>delete p.nbaTeamId);localStorage.setItem('halfcourt-lineups-v1',JSON.stringify(s));return localStorage.getItem('halfcourt-lineups-v1')})()`);
  await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-configure]'))");
  assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),beforeLegacy,'reading legacy profiles does not rewrite archive');
  assert.ok(await evaluate("document.querySelector('#lineups-panel').textContent.includes('选择 NBA 球队')||document.querySelector('#lineups-panel').textContent.includes('选择NBA球队')"));

  async function checkNbaDrafts(){
    const before=await evaluate(`${disk}.profiles[0]`);
    await openWizard();await step(2);
    await chooseTeam('LAL');
    assert.deepEqual(await evaluate(`${disk}.profiles[0]`),before,'selecting a team changes only the task draft');
    await closeWizard('discard');
    assert.deepEqual(await evaluate(`${disk}.profiles[0]`),before,'canceling the configuration preserves saved kit');
    await openWizard();await step(2);
    assert.equal(await evaluate("document.querySelector('.lineup-wizard-kit .lineup-jersey').dataset.teamId"),'BOS','reopened task keeps the original saved team after cancellation');
    await step(1);
    await input('lineup-team-name','队名草稿仍保留');
    await step(2);await chooseTeam('BOS');await step(1);
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-team-name]').value"),'队名草稿仍保留','team picker preserves unrelated team name draft');
    await input('lineup-team-name',before.name);
    await step(2);await chooseTeam('LAL');await step(3);
    await action('lineup-save');await waitFor("document.querySelector('#lineups-panel').dataset.subview==='profiles'&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&!document.querySelector('#lineup-wizard-dialog').open");
    await send('Page.reload');await waitFor("Boolean(document.querySelector('[data-action=lineup-configure]'))");
    const after=await evaluate(`${disk}.profiles[0]`);
    assert.equal(after.nbaTeamId,'LAL');assert.deepEqual(after.players,before.players);assert.equal(after.name,before.name);
    assert.equal(after.id,before.id);assert.equal(after.revision,before.revision+1);
    assert.ok(await evaluate("[...document.querySelectorAll('.locker-bay[data-player-id] .lineup-jersey svg')].every(n=>n.textContent.includes('LAKERS'))"),'all members share selected kit');
    await openWizard();await step(2);await chooseTeam('BOS');await step(3);await action('lineup-save');
    await waitFor("document.querySelector('#lineups-panel').dataset.subview==='profiles'&&document.querySelector('#lineups-panel').getAttribute('aria-busy')==='false'&&!document.querySelector('#lineup-wizard-dialog').open");
  }
  async function tap(selector){await modalStable();const r=await evaluate(`(()=>{let r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(40)}
  async function screenshot(name){await waitFor('!document.body.dataset.pageTransition');await modalStable();await wait(500);await evaluate("document.querySelector('#toast-live').classList.remove('visible')");const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(r.data,'base64'))}
  async function checkRoster(width,height,count) {
    await wait(380);
    const scene=await evaluate("(()=>{const s=document.querySelector('.locker-scene'),b=s.getBoundingClientRect(),index=Number(s.dataset.playerIndex),bay=[...s.querySelectorAll('.locker-bay[data-player-id]')].find(n=>n.dataset.playerId===s.dataset.playerId),j=bay.querySelector('.locker-uniform svg').getBoundingClientRect(),v=s.querySelector('.locker-viewport').getBoundingClientRect(),r=bay.getBoundingClientRect();return{count:s.querySelectorAll('.locker-bay[data-player-id]').length,index,id:s.dataset.playerId,detail:document.querySelector('.locker-player-detail').textContent,centerError:Math.abs(r.x+r.width/2-v.x-v.width/2),widthError:Math.abs(r.width-v.width),jersey:j.width>15&&j.height>15&&j.left>=b.left-2&&j.right<=b.right+2}})()");
    assert.equal(scene.count,count,`${width}x${height}: all roster members remain in the scene`);
    assert.ok(scene.jersey&&scene.id&&scene.detail.length,`${width}x${height}: current player jersey and detail visible`);
    assert.ok(scene.centerError<=2,`${width}x${height}: selected locker settles in the center: ${scene.centerError}`);
    assert.ok(scene.widthError<=3,`${width}x${height}: one cabinet fills the viewport without neighboring peeks`);
  }
  async function checkLockerInteraction(count) {
    const selected=()=>evaluate("Number(document.querySelector('.locker-scene').dataset.playerIndex)");
    const diskBefore=await evaluate(`localStorage.getItem('halfcourt-lineups-v1')`);
    await action('lineup-player-go','[data-index="0"]');
    await gesture(-105,0);assert.equal(await selected(),1,'first locker left drag from jersey moves to second member');
    await gesture(105,0);assert.equal(await selected(),0,'right drag returns to first member');
    await gesture(-105,0,false,'.locker-bay[data-selected=true] .locker-nameplate');assert.equal(await selected(),1,'nameplate supports the same left drag');
    assert.equal(await evaluate("document.querySelector('#note-dialog').open"),false,'nameplate drag does not inspect');
    await gesture(105,0,false,'.locker-bay[data-selected=true] .locker-nameplate');assert.equal(await selected(),0);
    await action('lineup-player-next');assert.equal(await selected(),1);
    await openWizard();
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-name]').value"),'大李','configure opens the focused locker member');
    await closeWizard();
    await gesture(-105,0);
    if(await selected()!==2){await screenshot('hc010-gesture-failure.png');console.log('Gesture failure diagnostics:',await evaluate("({events:window.lockerEvents,scene:document.querySelector('.locker-scene').getBoundingClientRect().toJSON(),viewport:document.querySelector('.locker-viewport').getBoundingClientRect().toJSON()})"))}
    assert.equal(await selected(),2,'left swipe moves to next player');
    const moved=await evaluate("getComputedStyle(document.querySelector('.locker-track')).transform");
    await gesture(0,80);assert.equal(await selected(),2,'vertical movement cannot switch player');
    await gesture(90,0,true);assert.equal(await selected(),2,'canceled gesture cannot switch player');
    await gesture(105,0);assert.equal(await selected(),1,'right swipe moves to previous player');
    assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.locker-track')).transform"),moved,'locker scenery moves with selection');
    for(let i=1;i<count-1;i++)await action('lineup-player-next');
    assert.equal(await selected(),count-1);assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-next]').disabled"),true);
    await gesture(-105,0);assert.equal(await selected(),count-1,'last locker clamps movement');
    await action('lineup-player-go','[data-index="0"]');
    assert.equal(await evaluate("document.querySelector('[data-action=lineup-player-prev]').disabled"),true);
    await gesture(105,0);assert.equal(await selected(),0,'first locker clamps movement');
    if(count===4) {
      const profileIds=await evaluate(`${disk}.profiles.map(p=>p.id)`),otherId=profileIds[0],currentId=await evaluate(`${disk}.activeProfileId`);
      await action('lineup-player-go','[data-index="2"]');
      await selectArchive({evaluate,waitFor},otherId);assert.equal(await selected(),0,'each lineup keeps separate selected member');
      await action('lineup-player-go','[data-index="1"]');
      await selectArchive({evaluate,waitFor},currentId);assert.equal(await selected(),2,'returning restores this lineup member');
      await selectArchive({evaluate,waitFor},otherId);assert.equal(await selected(),1,'other lineup focus is preserved');
      await selectArchive({evaluate,waitFor},currentId);await action('lineup-player-go','[data-index="0"]');
    }
    assert.equal(await evaluate("localStorage.getItem('halfcourt-lineups-v1')"),diskBefore,'viewing lockers never changes stored lineup/context');
    assert.equal(await evaluate("document.querySelector('#note-dialog').open"),false,'drag does not open an accidental inspection');
    assert.ok(await evaluate("[...document.querySelectorAll('.locker-bay[data-selected=false] button')].every(n=>n.disabled&&n.tabIndex===-1)"),'offscreen locker buttons cannot receive focus without inert support');
    assert.ok(await evaluate("!document.activeElement?.closest('.locker-bay[data-selected=false]')"),'focus never remains on a hidden neighboring cabinet');
    if(count===3) {
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      await action('lineup-player-next');assert.equal(await selected(),1);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.locker-track')).transitionDuration"),'0s');
      await action('lineup-player-go','[data-index="0"]');
      await send('Emulation.setEmulatedMedia',{features:[]});
    }
  }
  async function gesture(dx,dy,cancel=false,selector='.locker-bay[data-selected=true] .locker-uniform') {
    await modalStable();
    await evaluate("window.lockerEvents=[];if(!window.lockerRecording){window.lockerRecording=true;for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(type,e=>window.lockerEvents.push({type,target:e.target.tagName,cls:e.target.getAttribute('class'),x:e.clientX,y:e.clientY,button:e.button,primary:e.isPrimary}),true)}");
    const point=await evaluate(`(()=>{let r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height*.55}})()`);
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    for(let i=1;i<=5;i++){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+dx*i/5,y:point.y+dy*i/5}]});await wait(15)}
    await send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await wait(380);
  }
  async function checkLayout(width,height,label) {
    await modalStable();
    const result=await evaluate(`(()=>{
      const dialogs=[...document.querySelectorAll('dialog[open]')];
      const top=document.activeElement?.closest('dialog[open]')||dialogs.find(n=>n.id==='note-dialog')||dialogs.at(-1);
      const visible=n=>(!top||top.contains(n))&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden],[inert],[aria-hidden=true]');
      const controls=[...document.querySelectorAll('button,input,select,#court')].filter(visible);
      return{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,
        out:controls.map(n=>({id:n.id||n.dataset.action||n.dataset.viewTarget,r:n.getBoundingClientRect().toJSON()})).filter(({r})=>r.width&&r.height&&(r.x< -2||r.y< -2||r.right>innerWidth+2||r.bottom>innerHeight+2)),
        overflow:[...document.querySelectorAll('#lineups-panel,.lineup-recommendation-detail,.lineup-glass-sheet,.lineup-sheet-content')].filter(visible).filter(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2).map(n=>({id:n.id||n.className,sh:n.scrollHeight,ch:n.clientHeight,sw:n.scrollWidth,cw:n.clientWidth})),
        blocked:controls.filter(n=>n.matches('button,input,select')&&!n.disabled&&getComputedStyle(n).opacity!=='0').filter(n=>{const r=n.getBoundingClientRect();if(r.width<5||r.height<5)return false;const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit!==n&&!n.contains(hit)}).map(n=>n.id||n.dataset.action||n.dataset.viewTarget)};
    })()`);
    if(result.out.length||result.overflow.length||result.w>width+2||result.h>height+2) await screenshot(`hc008-failure-${width}-${height}.png`);
    assert.ok(result.w<=width+2&&result.h<=height+2,`${label}: ${JSON.stringify(result)}`);
    assert.deepEqual(result.out,[],`${width}x${height} ${label}: controls fit`);assert.deepEqual(result.overflow,[],`${width}x${height} ${label}: readable contents fit`);
    assert.deepEqual(result.blocked,[],`${width}x${height} ${label}: active modal or page controls are not covered`);
  }
}
