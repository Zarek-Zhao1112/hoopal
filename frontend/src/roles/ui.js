import { templates } from '../../../shared/templates.js';
import { getRolePlanState, suggestRoleAlternatives, ROLE_ACTIONS } from '../../../shared/tactic-roles.js';
import { playerName } from '../lineups/views/text.js';
import { createLineupSheet } from '../lineups/components/sheet.js';

/** Presentation and unsaved role drafts only; all persistence belongs to onAction. */
export function createTacticRolesUI({document,root,onAction,onInspect,onModalChange,onClose}) {
  if (!root || typeof onAction !== 'function') throw new TypeError('战术条件界面需要 root 与 onAction');
  const window=document.defaultView;
  let state={profiles:[],activeProfileId:null,rolePlans:{}}, busy=false, writeLocked=false, error='';
  let opened=false, templateId=null, draft=null, pending=false, sheetError='', focusRole=null;
  const node=(tag,className='',text)=>{const element=document.createElement(tag);element.className=className;if(text!==undefined)element.textContent=String(text);return element;};
  const template=()=>templates.find(item=>item.id===templateId);
  const profile=()=>state.profiles.find(item=>item.id===state.activeProfileId);
  const compatible=()=>Boolean(profile() && template()?.mode===profile().mode);
  const locked=()=>busy||pending;
  const sheet=createLineupSheet({document,id:'role-confirm-dialog',labelledBy:'role-confirm-title',onRequestClose:closeDraft,onModalChange(open){
    onModalChange?.(open);
    if(!open && focusRole){const id=focusRole;focusRole=null;window.requestAnimationFrame(()=>[...root.querySelectorAll('[data-role-id]')].find(item=>item.dataset.roleId===id)?.focus({preventScroll:true}));}
  }});
  sheet.dialog.classList.add('role-confirm-dialog');sheet.panel.classList.add('role-confirm-sheet');
  function button(text,action,callback,{disabled=false,className='button button-subtle',data={}}={}) {
    const element=node('button',className,text);element.type='button';element.dataset.action=action;
    Object.assign(element.dataset,data);element.disabled=locked()||disabled;
    element.addEventListener('click',()=>{if(element.disabled||!element.isConnected||locked()||sheet.closing)return;if(sheet.isOpen&&!sheet.panel.contains(element))return;callback(element);});
    return element;
  }
  function currentPlan() {return state.rolePlans?.[profile()?.id]?.[templateId]||null;}
  function planState(){return getRolePlanState(currentPlan(),template(),compatible()?profile():null);}
  function conditionText(id){const action=ROLE_ACTIONS?.[id];return typeof action==='string'?action:action?.label||action?.description||id;}
  function notice(text,className=''){const p=node('p',`role-notice ${className}`,text);p.setAttribute(className==='error'?'role':'aria-live',className==='error'?'alert':'polite');return p;}
  function memberLabel(member){return playerName(member,profile()?.players.indexOf(member)??0);}
  async function perform(kind,payload,{closeOnSuccess=false}={}){
    if(locked())return false;
    pending=true;error='';sheetError='';draw();
    let success=false;
    try{success=await onAction(kind,payload)===true;if(!success)sheetError='尚未保存，请检查提示后重试。选择仍保留。';}
    catch(reason){sheetError=reason?.message||'保存失败，请重试。选择仍保留。';}
    finally{pending=false;}
    if(success&&closeOnSuccess)closeDraft();
    if(success&&['play-generic','play-roles'].includes(kind))close();
    draw();return success;
  }
  function openDraft(roleId,trigger){
    if(!compatible()||writeLocked||locked()||sheet.isOpen||planState().needsReview)return;
    const role=planState().roles.find(item=>item.id===roleId);if(!role)return;
    draft={roleId,status:role.status,memberId:role.memberId,profileId:profile().id,expectedRevision:profile().revision};
    focusRole=roleId;sheetError='';sheet.rememberTrigger(trigger);drawSheet();sheet.open();
  }
  function closeDraft(){if(locked()||sheet.closing)return;draft=null;sheetError='';sheet.close();}
  function drawSheet(){
    if(!draft)return;
    const prior=document.activeElement, action=sheet.panel.contains(prior)?prior?.dataset.action:null, value=prior?.dataset.value;
    const t=template(), team=profile(), info=planState(), role=info.roles.find(item=>item.id===draft.roleId);
    if(!role||!team||team.id!==draft.profileId){sheetError='当前球队已改变，请关闭面板重新确认。';}
    sheet.panel.replaceChildren();sheet.dialog.setAttribute('aria-busy',String(locked()));
    const heading=node('header','lineup-sheet-heading'),title=node('div');title.append(node('p','',`${t.title} · ${role?.number??''} 号职责`));
    const h=node('h2','',role?.title||'角色已改变');h.id='role-confirm-title';title.append(h);heading.append(title,button('×','role-cancel',closeDraft,{className:'icon-button',data:{value:'close'}}));
    const content=node('div','role-sheet-content');
    content.append(node('p','role-task',role?.task||'请返回重新查看战术条件。'));
    const actions=node('ul','role-actions');for(const id of role?.actionIds||[])actions.append(node('li','',conditionText(id)));content.append(actions);
    const statuses=node('fieldset','role-responses');statuses.append(node('legend','','本队有人能完成这些动作吗？'));
    for(const [id,label] of [['available','有人可以'],['unknown','还不确定'],['missing','暂时没有']]){
      const option=button(label,'role-status',()=>{draft.status=id;if(id!=='available')draft.memberId=null;sheetError='';drawSheet();},{data:{value:id}});option.setAttribute('aria-pressed',String(draft.status===id));statuses.append(option);
    }content.append(statuses);
    if(draft.status==='available'&&team){
      const group=node('fieldset','role-members');group.append(node('legend','','选择本次承担的队员'));
      for(const member of team.players){
        const occupied=info.roles.find(item=>item.id!==draft.roleId&&item.status==='available'&&item.memberId===member.id);
        const option=button('', 'role-member',()=>{draft.memberId=member.id;sheetError='';drawSheet();},{disabled:Boolean(occupied),data:{value:member.id}});
        option.append(node('span','role-member-number',String(member.number)),node('strong','',memberLabel(member)),node('small','',occupied?`已承担：${occupied.title}`:'可认领'));
        option.setAttribute('aria-pressed',String(draft.memberId===member.id));group.append(option);
      }content.append(group,node('p','role-hint','同一套战术一人一个职责；可先解除原认领，再调整分工。'));
    }else content.append(node('p','role-hint',draft.status==='missing'?'会保留这个待补条件，也可以查看其他动作要求的战术。':'先看通用示范，再和队友一起试一试；不会当作已确认。'));
    const footer=node('footer','role-sheet-footer');
    if(sheetError||error)footer.append(notice(sheetError||error,'error'));
    footer.append(button(pending?'正在保存…':draft.status==='available'?'确认这名队员承担':'保存这个状态','role-save',()=>perform('confirm-role',{templateId,roleId:draft.roleId,status:draft.status,memberId:draft.status==='available'?draft.memberId:null,expectedRevision:draft.expectedRevision},{closeOnSuccess:true}),{className:'button button-primary',disabled:writeLocked||!compatible()||team?.id!==draft.profileId||draft.status==='available'&&!draft.memberId}));
    sheet.panel.append(heading,content,footer);sheet.refreshIsolation();
    if(action){const target=[...sheet.panel.querySelectorAll('[data-action]')].find(item=>item.dataset.action===action&&item.dataset.value===value&&!item.disabled);target?.focus({preventScroll:true});}
  }
  function draw(){
    root.hidden=!opened;document.body.dataset.roleConditions=String(opened);if(!opened)return;
    const t=template();if(!t)return;
    root.replaceChildren();root.setAttribute('aria-busy',String(locked()));
    const head=node('header','role-heading'),copy=node('div');copy.append(node('p','','战术条件'),node('h1','',t.title));head.append(button('‹','role-close',()=>close(),{className:'icon-button'}),copy);root.append(head);
    const select=node('select','role-template-select');select.setAttribute('aria-label','查看其他战术条件');select.dataset.action='role-template';select.disabled=locked()||sheet.isOpen;
    for(const item of templates){const option=node('option','',`${item.mode} · ${item.kind==='defense'?'防守':'进攻'} · ${item.title}`);option.value=item.id;option.selected=item.id===templateId;select.append(option);}
    select.addEventListener('change',()=>{if(!locked()&&!sheet.isOpen){templateId=select.value;error='';draw();}});root.append(select);
    const body=node('div','role-condition-content');
    if(writeLocked){body.append(notice('本机档案暂时无法读取，恢复前不会覆盖。','error'),button('选择或重试读取球队','role-choose-team',()=>onAction('choose-team',{})));}
    else if(!compatible()){body.append(node('h2','',profile()?'这套战术需要另一支球队':'先选择自己的球队'),notice(profile()?`${t.mode} 战术需要 ${t.mode==='4v4'?4:3} 名队员，当前是 ${profile().mode}。`:'没有球队也可以观看通用示范。'),button('去我的选择球队','role-choose-team',()=>onAction('choose-team',{}),{className:'button button-primary'}));}
    const info=planState();
    const summary=node('div','role-summary');summary.append(node('strong','',compatible()?`${profile().name} · 已确认 ${info.confirmedCount} / ${t.roles.length}`:`${t.mode} · ${t.roles.length} 个本队职责`),node('small','',info.ready?'条件已确认，可先试练':'按具体动作判断，不按体型打分'));body.append(summary);
    if(info.needsReview){body.append(notice('这套战术的角色已更新，旧分工不会自动套用。请先重置，再逐个重新确认。'),button('重置本套分工，重新确认','role-reset',()=>perform('reset-role-plan',{templateId,expectedRevision:profile().revision}),{disabled:writeLocked||!compatible()}));}
    const list=node('div','role-condition-list');
    for(const role of info.roles){
      const member=profile()?.players.find(item=>item.id===role.memberId),card=button('','role-open',trigger=>openDraft(role.id,trigger),{disabled:!compatible()||writeLocked||info.needsReview,className:'role-condition-card',data:{roleId:role.id}});
      card.dataset.status=role.status;const top=node('div','role-card-top');top.append(node('span','role-number',String(role.number)),node('strong','',role.title),node('span','role-state',role.status==='available'&&member?'已确认':role.status==='missing'?'暂时没有':'待确认'));
      card.append(top,node('p','role-task',role.task),node('small','role-card-person',role.status==='available'&&member?`${memberLabel(member)} · ${member.number} 号`:'点开确认具体动作和承担者'));list.append(card);
    }body.append(list);
    const missing=info.roles.find(item=>item.status==='missing');
    if(missing){const others=suggestRoleAlternatives(t,missing.id,templates).slice(0,3);if(others.length){const alternatives=node('section','role-alternatives');alternatives.append(node('strong','','也可看看这些战术'),node('small','','动作要求不同，仍需重新确认。'));for(const item of others)alternatives.append(button(item.title,'role-alternative',()=>{templateId=item.id;error='';draw();},{data:{templateId:item.id}}));body.append(alternatives);}}
    const confirmed=info.roles.filter(role=>role.status==='available'&&role.memberId);
    if(compatible()&&!writeLocked&&confirmed.length>1){
      const exchange=node('details','role-exchange'),summary=node('summary','','调整已确认的分工');exchange.append(summary);
      const a=node('select'),b=node('select');a.setAttribute('aria-label','交换的第一个职责');b.setAttribute('aria-label','交换的第二个职责');
      for(const [index,role] of confirmed.entries()){for(const select of [a,b]){const option=node('option','',role.title);option.value=role.id;select.append(option);}if(index===1)b.value=role.id;}
      const preview=node('div','role-swap-preview');
      const submit=button('确认两人能完成新职责并交换','role-swap',()=>perform('swap-roles',{templateId,roleA:a.value,roleB:b.value,expectedRevision:profile().revision}),{disabled:false});
      const sync=()=>{submit.disabled=locked()||a.value===b.value;preview.replaceChildren();if(a.value===b.value)return;const first=confirmed.find(role=>role.id===a.value),second=confirmed.find(role=>role.id===b.value);for(const [from,to] of [[first,second],[second,first]]){const member=profile().players.find(item=>item.id===from.memberId);preview.append(node('p','role-task',`${memberLabel(member)}将承担「${to.title}」：${to.task}`));for(const id of to.actionIds)preview.append(node('small','role-card-person',conditionText(id)));}};
      a.addEventListener('change',sync);b.addEventListener('change',sync);a.disabled=locked();b.disabled=locked();sync();exchange.append(a,b,preview,submit);body.append(exchange);
    }
    root.append(body);
    const foot=node('footer','role-main-footer');if(error||!draft&&sheetError)foot.append(notice(error||sheetError,'error'));
    foot.append(button('看通用示范','role-generic',()=>perform('play-generic',{templateId}),{disabled:writeLocked}),button('按本队演练','role-play',()=>perform('play-roles',{templateId}),{className:'button button-primary',disabled:writeLocked||!compatible()||!info.ready}));
    root.append(foot);if(draft)drawSheet();sheet.refreshIsolation();
  }
  function close({immediate=false}={}){if(locked()||sheet.isOpen&&!immediate)return false;if(immediate&&sheet.isOpen){draft=null;sheet.close({immediate:true});}opened=false;root.hidden=true;document.body.dataset.roleConditions='false';onClose?.();return true;}
  return {
    render({state:next,busy:nextBusy=false,error:nextError='',writeLocked:nextLocked=false}){state=next||{profiles:[],activeProfileId:null,rolePlans:{}};busy=Boolean(nextBusy);writeLocked=Boolean(nextLocked);error=nextError||'';draw();},
    open(id){if(locked()||sheet.isOpen||!templates.some(item=>item.id===id))return false;templateId=id;opened=true;error='';sheetError='';draw();return true;},
    close,
    handleBack(){if(!opened&&!sheet.isOpen)return false;if(locked())return true;if(sheet.isOpen){closeDraft();return true;}close();return true;},
    get isOpen(){return opened;},get isModalOpen(){return sheet.isOpen;}
  };
}
