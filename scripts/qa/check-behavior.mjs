import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {templates} from '../../shared/templates.js';
import {offenseRules} from '../../data/recommendations/offense.js';
import {recommendLineup} from '../../shared/recommendations.js';

const file=process.argv[2];
if(!file)throw Error('Usage: node scripts/qa/check-behavior.mjs <baseline.json>');
const baseline=JSON.parse(await readFile(file,'utf8'));
assert.equal(templates.length,baseline.templates.length);
for(const[index,t]of templates.entries()){
 const old=baseline.templates[index];assert.equal(t.id,old.id,'Stable tactic order');
 assert.equal(t.mode,old.mode);assert.equal(t.kind,old.kind);
 assert.deepEqual(t.build().frames,old.frames,`${t.id}: full frame compatibility`);
 for(const key of ['title','description','category','difficulty'])assert.equal(t[key],old.metadata[key]);
}
assert.deepEqual(offenseRules,baseline.rules,'Role weights and execution requirements');
for(const fixture of baseline.recommendations)assert.deepEqual(recommendLineup(fixture.profile),fixture.result,fixture.profile.id);
for(const[file,sha]of Object.entries(baseline.identity))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),sha,file);
console.log(JSON.stringify({templates:templates.length,rules:offenseRules.length,recommendationCases:baseline.recommendations.length,identityFiles:Object.keys(baseline.identity).length,unchanged:true}));
