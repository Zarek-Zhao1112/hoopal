import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';
import { createLineup } from '../../shared/lineups.js';
import { createRolePlan, getRolePlanState } from '../../shared/tactic-roles.js';
import { emptyLineupState } from '../../frontend/src/storage/lineups.js';

/** Production dist interactions in the caller's disposable browser, never a phone. */
export async function runRoleRequirementsFlow({ send, evaluate, wait, waitFor, folder }) {
  const archiveKey='halfcourt-lineups-v1',selectionKey='halfcourt-builtin-selection-v1';
  const panel='#role-requirements-panel',sheet='#role-confirm-dialog';
  const entryViewport=await evaluate('({width:innerWidth,height:innerHeight})');
  const original=await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`);
  const report={catalog:[],states:[],mappings:[],layouts:[],cancelNoWrites:false,failureRetry:false,staleReset:false,missingTeam:false,modeMismatch:false};
  const idle=()=>waitFor("document.body.dataset.appReady==='true'&&!document.querySelector('#startup-screen')&&!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')");
  const archive=()=>evaluate(`JSON.parse(localStorage.getItem('${archiveKey}'))`);
  const screenshot=async name=>{const result=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(result.data,'base64'));};
  async function click(selector) {
    const p=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled)throw Error('Missing/disabled '+${JSON.stringify(selector)});n.scrollIntoView({block:'nearest',inline:'nearest'});const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);if(!r.width||!r.height||!(h===n||n.contains(h)))throw Error('Cannot hit '+${JSON.stringify(selector)}+' hit '+h?.outerHTML?.slice(0,200));return{x,y}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:p.x,y:p.y,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x,y:p.y,button:'left',buttons:0,clickCount:1});
  }
  const key=async name=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name});await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name});};
  async function documentWith(state,selection={templateId:'pick-roll',frameIndex:0}) {
    await evaluate("window.__hc054RoleRestore?.();if(window.__hc054RoleFault){Storage.prototype.setItem=window.__hc054RoleFault;delete window.__hc054RoleFault;}if(document.querySelector('#play-toggle')?.getAttribute('aria-pressed')==='true')document.querySelector('#play-toggle').click()");
    const raw=typeof state==='string'?state:JSON.stringify(state),selected=typeof selection==='string'?selection:JSON.stringify(selection);
    const source=`${state===null?`localStorage.removeItem('${archiveKey}')`:`localStorage.setItem('${archiveKey}',${JSON.stringify(raw)})`};${selection===null?`localStorage.removeItem('${selectionKey}')`:`localStorage.setItem('${selectionKey}',${JSON.stringify(selected)})`};window.__hc054RoleReady=true;`;
    const injected=await send('Page.addScriptToEvaluateOnNewDocument',{source});
    try {await evaluate('window.__hc054RoleReady=false');await send('Page.reload');await waitFor("window.__hc054RoleReady&&document.body?.dataset.appReady==='true'&&!document.querySelector('#startup-screen')");}
    finally {await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected.identifier});}
    await idle();
  }
  function profileFor(mode) {
    const p=createLineup(mode,{id:`hc054-roles-${mode}`,name:`条件确认${mode}球队`,nbaTeamId:'BOS'});
    p.players.forEach((member,index)=>{member.name=['小王','小李','小张','小陈'][index];member.number=[7,12,30,88][index];});return p;
  }
  function stateWith(profile,plans={}) {return{...emptyLineupState(),profiles:[profile],activeProfileId:profile.id,rolePlans:{[profile.id]:plans}};}
  async function openFromLocker(id) {
    await click('[data-view-target=lineups]');await idle();await click('[data-action=lineup-conditions]');await idle();
    await waitFor("document.body.dataset.roleConditions==='true'");
    if(id)await selectTemplate(id);
  }
  async function selectTemplate(id) {
    await evaluate(`(()=>{const select=document.querySelector('${panel} [data-action=role-template]');if(!select||select.disabled)throw Error('Conditions selector unavailable');select.value=${JSON.stringify(id)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(`document.querySelector('${panel} h1')?.textContent===${JSON.stringify(templates.find(t=>t.id===id).title)}`);
  }
  async function openRole(id) {await click(`${panel} [data-role-id="${id}"]`);await waitFor(`document.querySelector('${sheet}')?.open&&document.querySelector('${sheet} [data-action=role-status]')&&!document.querySelector('${sheet}').dataset.closing`);await wait(50);}
  async function response(status,memberId) {
    await click(`${sheet} [data-action=role-status][data-value="${status}"]`);
    if(status==='available')await click(`${sheet} [data-action=role-member][data-value="${memberId}"]`);
  }
  async function saveRole() {await click(`${sheet} [data-action=role-save]`);await waitFor(`!document.querySelector('${sheet}').open`);await idle();}
  async function confirmAll(t,p) {for(let i=0;i<t.roles.length;i++){await openRole(t.roles[i].id);await response('available',p.players[i].id);await saveRole();}}
  async function audit() {await evaluate(`(()=>{const prior=Storage.prototype.setItem;window.__hc054RoleWrites=[];Storage.prototype.setItem=function(k,v){if(['${archiveKey}','${selectionKey}'].includes(k))window.__hc054RoleWrites.push({key:k,value:v});return prior.call(this,k,v)};window.__hc054RoleRestore=()=>{Storage.prototype.setItem=prior;delete window.__hc054RoleRestore}})()`);}
  try {
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await documentWith(emptyLineupState());await click('[data-view-target=library]');await idle();
    await click('.library-card-heading[data-template-id=pick-roll]');
    await waitFor("document.querySelector('.library-deck').dataset.transitioning==='false'");
    await click('[data-conditions-template=pick-roll]');await waitFor("document.body.dataset.roleConditions==='true'");
    assert.ok(await evaluate(`document.querySelector('${panel} [data-action=role-choose-team]')!==null`));
    assert.ok(await evaluate(`[...document.querySelectorAll('${panel} [data-role-id]')].every(n=>n.disabled&&n.dataset.status==='unknown')`));
    assert.equal(await evaluate(`document.querySelector('${panel} [data-action=role-play]').disabled`),true);
    assert.equal(await evaluate(`document.querySelector('${panel} [data-action=role-generic]').disabled`),false);report.missingTeam=true;
    // Each registered play is visited through the real conditions selector; no
    // hand-written tactic whitelist can hide a missing role from this flow.
    for(const mode of ['3v3','4v4']) {
      const p=profileFor(mode);await documentWith(stateWith(p));await openFromLocker();
      for(const t of templates.filter(item=>item.mode===mode)) {
        await selectTemplate(t.id);
        const rows=await evaluate(`[...document.querySelectorAll('${panel} [data-role-id]')].map(n=>({id:n.dataset.roleId,status:n.dataset.status,title:n.querySelector('strong').textContent,task:n.querySelector('.role-task').textContent}))`);
        assert.deepEqual(rows,t.roles.map(role=>({id:role.id,status:'unknown',title:role.title,task:role.task})),t.id);
        assert.equal(await evaluate(`document.querySelector('${panel} [data-action=role-play]').disabled`),true);
        report.catalog.push({id:t.id,kind:t.kind,mode,roles:rows.length});
      }
    }
    assert.equal(report.catalog.length,26);assert.equal(report.catalog.reduce((n,t)=>n+t.roles,0),91);
    const mismatchTeam=profileFor('3v3');await documentWith(stateWith(mismatchTeam));await openFromLocker('high-low');await audit();
    assert.ok(await evaluate(`[...document.querySelectorAll('${panel} [data-role-id]')].every(n=>n.disabled&&n.dataset.status==='unknown')`));
    assert.equal(await evaluate(`document.querySelector('${panel} [data-action=role-play]').disabled`),true);
    await click(`${panel} [data-action=role-choose-team]`);await idle();
    assert.equal(await evaluate('document.body.dataset.view'),'archives');assert.equal(await evaluate('document.body.dataset.roleConditions'),'false');
    assert.deepEqual(await evaluate(`window.__hc054RoleWrites.filter(item=>item.key==='${archiveKey}')`),[],'choosing another team opens archive management without inventing confirmations');report.modeMismatch=true;
    // Three statuses stay distinct. Cancel is deliberately tested after changing
    // both draft status and person, with exact persisted bytes and write count.
    const p=profileFor('3v3'),t=templates.find(t=>t.id==='pick-roll');
    await documentWith(stateWith(p));await openFromLocker(t.id);await audit();
    const before=await archive();await openRole('attack-1');await response('available',p.players[0].id);await key('Escape');await waitFor(`!document.querySelector('${sheet}').open`);
    assert.deepEqual(await archive(),before);assert.deepEqual(await evaluate('window.__hc054RoleWrites'),[]);report.cancelNoWrites=true;
    await openRole('attack-1');await response('unknown');await saveRole();
    let stored=await archive();assert.equal(stored.rolePlans[p.id][t.id].assignments[0].status,'unknown');assert.equal(stored.rolePlans[p.id][t.id].assignments[0].memberId,null);report.states.push('unknown');
    await openRole('attack-2');await response('missing');await saveRole();
    stored=await archive();assert.equal(stored.rolePlans[p.id][t.id].assignments[1].status,'missing');assert.equal(stored.rolePlans[p.id][t.id].assignments[1].memberId,null);report.states.push('missing');
    const alternatives=await evaluate(`[...document.querySelectorAll('${panel} [data-action=role-alternative]')].map(n=>n.dataset.templateId)`);
    assert.ok(alternatives.includes('give-go'));assert.equal(await evaluate(`document.querySelector('${panel} [data-action=role-play]').disabled`),true);
    await openRole('attack-1');await response('available',p.players[0].id);await saveRole();report.states.push('available');
    await openRole('attack-2');await response('available',p.players[1].id);
    assert.equal(await evaluate(`document.querySelector('${sheet} [data-action=role-member][data-value="${p.players[0].id}"]').disabled`),true,'occupied member cannot be chosen twice');
    const preFailure=await archive();
    await evaluate(`window.__hc054RoleFault=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='${archiveKey}')throw Error('HC054 simulated role write failure');return window.__hc054RoleFault.call(this,k,v)}`);
    try {
      await click(`${sheet} [data-action=role-save]`);await waitFor(`document.querySelector('${sheet} [role=alert]')?.textContent.includes('尚未保存')&&!document.querySelector('${sheet} [data-action=role-save]').disabled`);
      assert.deepEqual(await archive(),preFailure);assert.equal(await evaluate(`document.querySelector('${sheet} [data-action=role-status][data-value=available]').getAttribute('aria-pressed')`),'true');
      assert.equal(await evaluate(`document.querySelector('${sheet} [data-action=role-member][data-value="${p.players[1].id}"]').getAttribute('aria-pressed')`),'true');
      await screenshot('hc054-role-save-failed-draft.png');
    } finally {await evaluate('Storage.prototype.setItem=window.__hc054RoleFault;delete window.__hc054RoleFault');}
    await saveRole();report.failureRetry=true;
    await openRole('attack-3');await response('available',p.players[2].id);await saveRole();
    stored=await archive();assert.equal(getRolePlanState(stored.rolePlans[p.id][t.id],t,stored.profiles[0]).ready,true);
    await screenshot('hc054-role-conditions-confirmed.png');
    // Exercise real handoff into the SVG for both team sizes and both sides.
    const cases=['pick-roll','defense-3v3-help-rotation','screen-the-screener','defense-4v4-help-rotation'];
    for(const id of cases) {
      const target=templates.find(t=>t.id===id),team=profileFor(target.mode);
      await documentWith(stateWith(team),{templateId:id,frameIndex:0});await openFromLocker(id);await confirmAll(target,team);
      await click(`${panel} [data-action=role-play]`);await waitFor("document.body.dataset.view==='play'&&document.body.dataset.roleConditions==='false'");await idle();
      assert.equal(await evaluate('document.body.dataset.lineupContext'),team.id);
      const titles=await evaluate("Object.fromEntries([...document.querySelectorAll('#players-layer [data-player]')].map(n=>[n.dataset.player,n.querySelector('title').textContent]))");
      target.roles.forEach((role,index)=>{assert.ok(titles[role.playerId].includes(team.players[index].name),`${id} ${role.playerId} maps actual teammate`);assert.ok(titles[role.playerId].includes(String(team.players[index].number)));});
      const enemy=target.kind==='defense'?'attack':'defense';assert.ok(Object.entries(titles).filter(([id])=>id.startsWith(enemy+'-')).every(([,title])=>!team.players.some(member=>title.includes(member.name))),'opponents never inherit friendly identities');
      const state=await archive();assert.equal(state.playbackContext.source,'role-confirmations');assert.equal(state.playbackContext.templateId,id);
      await screenshot(`hc054-role-training-${id}.png`);report.mappings.push({id,mode:target.mode,side:target.kind,actors:target.roles.map(role=>role.playerId)});
      await openFromLocker(id);await click(`${panel} [data-action=role-generic]`);await waitFor("document.body.dataset.view==='play'&&document.body.dataset.roleConditions==='false'");await idle();
      assert.equal((await archive()).playbackContext,null);assert.equal(await evaluate('document.body.dataset.lineupContext'),'');
      const generic=await evaluate("[...document.querySelectorAll('#players-layer title')].map(n=>n.textContent)");assert.ok(generic.every(title=>!team.players.some(member=>title.includes(member.name))));
    }
    // Historical role versions preserve old assignments but cannot be silently
    // edited, played or reused under the current duty definition.
    const stale=createRolePlan(t,p);stale.roleVersion=t.roleVersion+1;stale.assignments[0]={roleId:t.roles[0].id,status:'available',memberId:p.players[0].id};
    await documentWith(stateWith(p,{[t.id]:stale}));await openFromLocker(t.id);
    assert.ok(await evaluate(`document.querySelector('${panel} [data-action=role-reset]')!==null`));
    assert.ok(await evaluate(`[...document.querySelectorAll('${panel} [data-role-id]')].every(n=>n.disabled&&n.dataset.status==='unknown')`));
    const staleRaw=await archive();assert.deepEqual(staleRaw.rolePlans[p.id][t.id],stale);
    await click(`${panel} [data-action=role-reset]`);await waitFor(`!document.querySelector('${panel} [data-action=role-reset]')&&!document.querySelector('${panel} [data-role-id]').disabled`);
    stored=await archive();assert.equal(stored.rolePlans[p.id][t.id].roleVersion,t.roleVersion);assert.ok(stored.rolePlans[p.id][t.id].assignments.every(row=>row.status==='unknown'&&row.memberId===null));report.staleReset=true;
    // The overlay must preserve the established card/nav frame. Internal scroll
    // is allowed; the page itself stays within the viewport on short screens.
    for(const [width,height] of [[390,844],[360,400],[844,390],[1024,768]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await wait(80);await openRole('attack-1');await response('available',p.players[0].id);
      const geometry=await evaluate(`(()=>{const d=document.querySelector('${sheet}'),panel=d.querySelector('.role-confirm-sheet'),save=d.querySelector('[data-action=role-save]'),r=panel.getBoundingClientRect(),b=save.getBoundingClientRect();return{width:innerWidth,height:innerHeight,page:document.documentElement.scrollHeight,panel:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},save:{left:b.left,right:b.right,top:b.top,bottom:b.bottom}}})()`);
      assert.ok(geometry.panel.left>=-1&&geometry.panel.right<=width+1&&geometry.panel.top>=-1&&geometry.panel.bottom<=height+1);
      assert.ok(geometry.save.top>=-1&&geometry.save.bottom<=height+1);assert.ok(geometry.page<=height+1);
      report.layouts.push(geometry);await click(`${sheet} [data-action=role-cancel]`);await waitFor(`!document.querySelector('${sheet}').open`);
    }
    await writeFile(path.join(folder,'hc054-role-requirements.json'),JSON.stringify(report,null,2));
  } finally {
    await evaluate("window.__hc054RoleRestore?.();if(window.__hc054RoleFault){Storage.prototype.setItem=window.__hc054RoleFault;delete window.__hc054RoleFault;}");
    await documentWith(original.archive,original.selection);
    await send('Emulation.setDeviceMetricsOverride',{...entryViewport,deviceScaleFactor:1,mobile:entryViewport.width<600});
    await send('Emulation.setEmulatedMedia',{features:[]});
    assert.deepEqual(await evaluate(`({archive:localStorage.getItem('${archiveKey}'),selection:localStorage.getItem('${selectionKey}')})`),original,'restore the exact incoming persisted bytes after every fixture');
    assert.deepEqual(await evaluate('({width:innerWidth,height:innerHeight})'),entryViewport,'the next flow inherits its original viewport');
  }
}
