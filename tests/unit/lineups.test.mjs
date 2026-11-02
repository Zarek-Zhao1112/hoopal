import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup, validateLineup, validateLegacyLineup, isLineupReady, MAX_LINEUPS } from '../../shared/lineups.js';
import { createRolePlan, getRolePlanState } from '../../shared/tactic-roles.js';
import { templates } from '../../shared/templates.js';
import { NBA_TEAMS } from '../../data/nba-teams.js';

test('new basic lineups have independent fixed rosters without ability fields, ready to save but no tactical confirmations',()=>{
  const a=createLineup(),b=createLineup('4v4');assert.equal(a.players.length,3);assert.equal(b.players.length,4);assert.notEqual(a.id,b.id);
  assert.equal(new Set([...a.players,...b.players].map(p=>p.id)).size,7);assert.deepEqual(a.players.map(p=>p.number),[1,2,3]);
  assert.equal(isLineupReady(a),true);assert.equal(isLineupReady({}),false);assert.equal(MAX_LINEUPS,20);
  for(const p of a.players)assert.deepEqual(Object.keys(p),['id','name','number']);
  const t=templates.find(t=>t.id==='pick-roll');assert.equal(getRolePlanState(createRolePlan(t,a),t,a).ready,false);
});

test('basic validation returns detached whitelisted text and drops retired traits rather than using hidden ratings',()=>{
  const input=createLineup('3v3',{name:'  测试队  ',id:'test-team',crest:'shield',color:'green'});input.extra={secret:true};
  Object.assign(input.players[0],{name:'<b>同名</b>',height:'tall',strengths:['passing'],weaknesses:['passing'],extra:'discard'});
  const copy=validateLineup(input);assert.equal(copy.name,'测试队');assert.equal(copy.players[0].name,'<b>同名</b>');
  assert.equal('extra' in copy,false);assert.deepEqual(Object.keys(copy.players[0]),['id','name','number']);
  copy.players[0].name='copy only';assert.equal(input.players[0].name,'<b>同名</b>');assert.deepEqual(input.players[0].strengths,['passing']);
});

test('invalid roster identities, numbers, metadata and bounds fail instead of silently merging members',()=>{
  for(const change of [p=>p.players.pop(),p=>p.players.push(p.players[0]),p=>p.players[1].id=p.players[0].id,p=>p.players[1].number=p.players[0].number,
    p=>p.players[0].number=100,p=>p.players[0].number=-1,p=>p.players[0].number=1.5,p=>p.revision=0,p=>p.revision=Infinity,p=>p.mode='5v5',
    p=>p.crest='custom',p=>p.color='red',p=>p.name='队'.repeat(41),p=>p.players[0].name='名'.repeat(25),p=>p.players[0].id='']){
    const p=createLineup();change(p);assert.throws(()=>validateLineup(p));
  }
  const zero=createLineup();zero.players[0].number=0;assert.equal(validateLineup(zero).players[0].number,0);
});

const legacyProfile=()=>{const p=createLineup();delete p.bodyType;for(const member of p.players)Object.assign(member,{height:'',build:'',mobility:'',strengths:[],weaknesses:[]});return p;};
test('schema1 legacy validation remains strict for corruption isolation without changing legacy raw input',()=>{
  const p=legacyProfile(),raw=structuredClone(p);p.players[0].strengths=['passing'];
  assert.deepEqual(validateLegacyLineup(p),p);assert.deepEqual(raw.players[0].strengths,[]);
  for(const change of [p=>p.players[0].strengths=['shooting','driving','passing','handling'],p=>p.players[0].weaknesses=['shooting','driving','passing'],
    p=>p.players[0].strengths=['passing','passing'],p=>{p.players[0].strengths=['passing'];p.players[0].weaknesses=['passing'];},p=>p.players[0].strengths=['dunking'],p=>p.players[0].mobility='fast']){
    const old=legacyProfile();change(old);assert.throws(()=>validateLegacyLineup(old));
  }
});

test('legacy missing NBA choice stays neutral while basic member IDs, names and numbers are retained',()=>{
  for(const mode of ['3v3','4v4']){
    const p=createLineup(mode,{crest:'bolt',color:'green'});p.players[0].name='老队员';p.recentTemplateId=mode==='3v3'?'give-go':'high-low';delete p.nbaTeamId;
    const before=structuredClone(p),normalized=validateLineup(p);assert.equal(normalized.nbaTeamId,null);assert.deepEqual(p,before);
    const {nbaTeamId,...rest}=normalized;assert.deepEqual(rest,before);
  }
});

test('all NBA choices survive detached JSON round trips for both roster sizes without generating role assignments',()=>{
  for(const mode of ['3v3','4v4'])for(const team of NBA_TEAMS){
    const p=createLineup(mode,{nbaTeamId:team.id,crest:'shield',color:'blue'});p.players[0].name='同名';p.players[1].name='同名';
    const copy=validateLineup(JSON.parse(JSON.stringify(p)));assert.deepEqual(copy,p);assert.notEqual(copy.players,p.players);assert.notEqual(copy.players[0],p.players[0]);
  }
});

test('invalid NBA values fail instead of being silently normalized',()=>{
  for(const id of ['', 'XXX','bos',' BOS ',1610612738,false,0,{},['BOS'],'__proto__']){
    const p=createLineup();p.nbaTeamId=id;assert.throws(()=>validateLineup(p),/NBA/);assert.throws(()=>createLineup('3v3',{nbaTeamId:id}),/NBA/);assert.equal(p.nbaTeamId,id);
  }
});
