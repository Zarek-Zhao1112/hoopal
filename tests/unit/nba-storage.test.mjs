import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY } from '../../frontend/src/storage/lineups.js';

test('legacy neutral NBA selection migrates on first write with exact original backup and keeps member identities after restart',async()=>{
  const legacy=createLineup('4v4',{name:'用户自己的队名',crest:'bolt',color:'green'});delete legacy.nbaTeamId;
  legacy.players.forEach(p=>Object.assign(p,{height:'',build:'',mobility:'',strengths:[],weaknesses:[]}));
  legacy.players[1].name='自己的中锋';legacy.players[1].number=88;legacy.players[1].height='tall';legacy.players[1].strengths=['passing'];
  const original=JSON.stringify({schemaVersion:1,profiles:[legacy],activeProfileId:legacy.id,playbackContext:null});
  const values=new Map([[LINEUPS_KEY,original]]),writes=[];const adapter={async getItem(k){return values.get(k)??null},async setItem(k,v){writes.push(k);values.set(k,v)}};
  const store=createLineupRepository({adapter,templates,makeBackupId:()=> 'nba'}),loaded=await store.load();
  assert.equal(loaded.state.profiles[0].nbaTeamId,null);assert.deepEqual(writes,[]);assert.equal(values.get(LINEUPS_KEY),original);
  loaded.state.profiles[0].nbaTeamId='BOS';await store.save(loaded.state);
  assert.deepEqual(writes,[LINEUPS_KEY+'.migration-v1-nba',LINEUPS_KEY]);assert.equal(values.get(LINEUPS_KEY+'.migration-v1-nba'),original);
  const restarted=await createLineupRepository({adapter,templates}).load();assert.equal(restarted.state.schemaVersion,2);assert.equal(restarted.state.profiles[0].nbaTeamId,'BOS');
  assert.deepEqual(restarted.state.profiles[0].players,legacy.players.map(({id,name,number})=>({id,name,number})));assert.deepEqual(restarted.state.rolePlans,{});
});
