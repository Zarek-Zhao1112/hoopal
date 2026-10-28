import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY, emptyLineupState } from '../../frontend/src/storage/lineups.js';

test('legacy profiles are read without migration writes and NBA selection preserves all member data after restart', async () => {
  const legacy=createLineup('4v4',{name:'用户自己的队名',crest:'bolt',color:'green'});
  delete legacy.nbaTeamId;
  legacy.players[1].name='自己的中锋';legacy.players[1].number=88;
  legacy.players[1].height='tall';legacy.players[1].strengths=['passing'];
  const original=JSON.stringify({...emptyLineupState(),profiles:[legacy],activeProfileId:legacy.id});
  const values=new Map([[LINEUPS_KEY,original]]),writes=[];
  const adapter={async getItem(k){return values.get(k)??null},async setItem(k,v){writes.push(k);values.set(k,v)}};
  const store=createLineupRepository({adapter,templates});
  const loaded=await store.load();
  assert.equal(loaded.state.profiles[0].nbaTeamId,null);
  assert.equal(loaded.warnings.length,0);assert.deepEqual(writes,[]);
  assert.equal(values.get(LINEUPS_KEY),original);
  loaded.state.profiles[0].nbaTeamId='BOS';
  await store.save(loaded.state);
  const restarted=await createLineupRepository({adapter,templates}).load();
  assert.equal(restarted.state.profiles[0].nbaTeamId,'BOS');
  const {nbaTeamId,...withoutTeam}=restarted.state.profiles[0];
  assert.deepEqual(withoutTeam,legacy);
  assert.equal(restarted.state.schemaVersion,1);
});
