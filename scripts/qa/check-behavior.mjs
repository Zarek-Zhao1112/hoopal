import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {templates} from '../../shared/templates.js';
import {validateTacticCatalog} from '../../shared/tactic-roles.js';

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
validateTacticCatalog(templates);
for(const[file,sha]of Object.entries(baseline.identity))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),sha,file);
console.log(JSON.stringify({templates:templates.length,roles:templates.reduce((n,t)=>n+t.roles.length,0),retired:'HC-054 replaces subjective weighted recommendations; their old results are intentionally not compatibility requirements',identityFiles:Object.keys(baseline.identity).length,framesAndIdentityUnchanged:true}));
