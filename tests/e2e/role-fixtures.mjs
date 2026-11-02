import {templates} from '../../shared/templates.js';
import {createRolePlan,setRoleResponse,getRolePlanState} from '../../shared/tactic-roles.js';

/** Explicit confirmed fixture for testing source safety; no capability inference. */
export function confirmedRolePlan(profile,templateId){
 const template=templates.find(t=>t.id===templateId);let plan=createRolePlan(template,profile);
 template.roles.forEach((role,index)=>{plan=setRoleResponse(plan,role.id,{status:'available',memberId:profile.players[index].id},template,profile)});return plan;
}
export function confirmedRoleArchive(profiles,activeProfileId,templateId){
 const profile=profiles.find(p=>p.id===activeProfileId),template=templates.find(t=>t.id===templateId);
 return{schemaVersion:2,profiles,activeProfileId,rolePlans:profile?{[profile.id]:{[templateId]:confirmedRolePlan(profile,templateId)}}:{},playbackContext:profile?{source:'role-confirmations',profileId:profile.id,profileRevision:profile.revision,templateId,roleVersion:template.roleVersion}:null};
}
export function explicitRoleAssignments(profile,templateId){
 const template=templates.find(t=>t.id===templateId);return getRolePlanState(confirmedRolePlan(profile,templateId),template,profile).roles.map(role=>({role:role.number,playerId:role.memberId,animationId:role.playerId,task:role.task}));
}
