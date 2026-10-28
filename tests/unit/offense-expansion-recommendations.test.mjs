import test from 'node:test';
import assert from 'node:assert/strict';
import {createLineup,SKILLS} from '../../shared/lineups.js';
import {templates} from '../../shared/templates.js';
import {recommendLineup} from '../../shared/recommendations.js';
import {offenseRules} from '../../data/recommendations/offense.js';

// Independent basketball-role scenarios; never derive player labels from weights.
const cases=[
 ['post-split',[['passing','screening'],['finishing'],['passing','handling']]],
 ['slip-screen',[['handling','passing'],['finishing','handling'],['shooting','passing']]],
 ['offball-flare',[['passing','handling'],['shooting'],['screening','passing']]],
 ['hammer',[['handling','driving','passing'],['shooting'],['screening','passing'],['shooting','passing']]],
 ['zoom-handoff',[['passing','screening','handling'],['handling','driving','passing'],['screening','passing','shooting'],['shooting','passing']]],
 ['screen-the-screener',[['handling','passing'],['screening','shooting'],['finishing'],['screening','finishing','passing']]],
];
function profileFor(strengths){
 const profile=createLineup(strengths.length===3?'3v3':'4v4',{id:'expansion-fixture'});
 profile.players.forEach((player,index)=>Object.assign(player,{id:`member-${index}`,height:'medium',build:'medium',mobility:'agile',strengths:[...strengths[index]],weaknesses:[]}));return profile;
}
const find=(profile,id)=>recommendLineup(profile).recommendations.find(item=>item.templateId===id);
const signature=profile=>recommendLineup(profile).recommendations.map(item=>[item.templateId,item.fit,item.assignments.map(assignment=>[assignment.role,assignment.playerId])]);

test('all eighteen offense sources have one matching full-roster rule and no defense rule',()=>{
 const offense=templates.filter(template=>template.kind==='offense');
 assert.equal(offenseRules.length,18);assert.equal(new Set(offenseRules.map(rule=>rule.templateId)).size,18);
 assert.deepEqual(offenseRules.map(rule=>rule.templateId).sort(),offense.map(template=>template.id).sort());
 for(const rule of offenseRules){
  const template=offense.find(template=>template.id===rule.templateId);assert.equal(rule.roles.length,template.mode==='3v3'?3:4);
  for(const role of rule.roles){assert.ok(Object.keys(role.weights).length);for(const [skill,value]of Object.entries(role.weights)){assert.ok(SKILLS.some(item=>item.id===skill));assert.ok(Number.isFinite(value)&&value>0)}assert.ok(role.essential.every(skill=>role.weights[skill]));}
 }
});

for(const [id,strengths]of cases){
 test(`${id} enters the actual top three and assigns the intended roles without mutating the profile`,()=>{
  const profile=profileFor(strengths),before=structuredClone(profile),item=find(profile,id);assert.ok(item,`${id} should be reachable in a suitable lineup`);assert.equal(item.fit,'recommended');
  assert.deepEqual(item.assignments.map(assignment=>assignment.playerId),profile.players.map(player=>player.id));assert.deepEqual(profile,before);
  const all=recommendLineup(profile).recommendations;assert.ok(all.length<=3);assert.equal(new Set(all.map(item=>item.templateId)).size,all.length);
  for(const candidate of all){assert.equal(templates.find(template=>template.id===candidate.templateId).mode,profile.mode);assert.equal(new Set(candidate.assignments.map(a=>a.playerId)).size,profile.players.length);}
 });
 test(`${id} keeps member-ID mapping across duplicate names, shirt changes and member reorder`,()=>{
  const profile=profileFor(strengths),before=signature(profile);profile.players.reverse();profile.players.forEach((player,index)=>{player.name='同名队员';player.number=90+index});profile.name='重新命名';profile.color='blue';
  assert.deepEqual(signature(profile),before);
 });
}

test('Slip finisher can be weak at contact screens without inventing a screening duty',()=>{
 const profile=profileFor(cases[1][1]);profile.players[1].weaknesses=['screening'];const item=find(profile,'slip-screen');assert.ok(item);assert.equal(item.fit,'recommended');assert.equal(item.assignments[1].playerId,'member-1');
 assert.match(item.assignments[1].task,/尚未建立接触.*顺下/);assert.ok(!item.cautions.some(line=>/掩护.*弱项/.test(line)));
});

test('Zoom maps its creator and final receiver to the actual handoff and final ball holder',()=>{
 const profile=profileFor(cases[4][1]),item=find(profile,'zoom-handoff'),frames=templates.find(t=>t.id==='zoom-handoff').build().frames;
 assert.ok(item);assert.match(item.assignments[0].task,/手递手.*掩护/);assert.match(item.assignments[1].task,/下掩护.*手递手.*突破.*4号/);assert.match(item.assignments[3].task,/最后接2号.*接投/);
 assert.equal(frames.at(-1).ball.holderId,'attack-4');assert.equal(item.assignments[3].playerId,'member-3');
});

test('STS receiving shooter still needs both screening and shooting; weaknesses lower or condition the choice',()=>{
 const profile=profileFor(cases[5][1]),item=find(profile,'screen-the-screener');assert.ok(item);assert.match(item.assignments[1].task,/掩护3号.*借4号.*投射/);
 const before=signature(profile);profile.players[1].strengths=['screening'];profile.players[1].weaknesses=['shooting'];
 const result=recommendLineup(profile),changed=result.recommendations.find(item=>item.templateId==='screen-the-screener');assert.notDeepEqual(signature(profile),before);
 if(changed){assert.equal(changed.fit,'conditional');assert.ok(changed.cautions.some(line=>/投射.*弱项|投射.*一般/.test(line)));}
});

test('post split separates post passing, guard screening and cutter finishing',()=>{
 const item=find(profileFor(cases[0][1]),'post-split');assert.match(item.assignments[0].task,/传给低位3号.*2号.*掩护/);assert.match(item.assignments[1].task,/切入.*终结/);assert.match(item.assignments[2].task,/低位.*回传/);
});
