import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuiltinRepository, BUILTIN_SELECTION_KEY, LEGACY_KEYS } from '../../frontend/src/storage/builtins.js';
import { createPlatformAdapters, FILE_NOT_FOUND } from '../../frontend/src/platform/core.js';
import { templates } from '../../shared/templates.js';

function memory(entries=[]) {
  const values=new Map(entries);
  return {values,get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function harness() {
  const values=new Map([[LEGACY_KEYS.draft,'private draft'],[LEGACY_KEYS.library,'private library']]);
  const legacy=memory([[LEGACY_KEYS.draft,'web draft'],[LEGACY_KEYS.library,'web library']]);
  const reads=[];
  const adapter={async getItem(key){reads.push(key);return values.get(key)??null;},async setItem(key,value){values.set(key,value);}};
  return {values,legacy,reads,adapter,repository:createBuiltinRepository({adapter,templates,getLegacyStorage:()=>legacy})};
}

test('authorized reset empties legacy keys in both stores without reading private Plays or making backups',async()=>{
  const h=harness();const loaded=await h.repository.load();
  assert.equal(loaded.legacyCleared,true);
  assert.deepEqual(loaded.selection,{templateId:templates[0].id,frameIndex:0});
  for(const store of [h.values,h.legacy.values]){assert.equal(store.get(LEGACY_KEYS.draft),'null');assert.equal(store.get(LEGACY_KEYS.library),'[]');assert.ok(![...store.keys()].some(key=>key.includes('.corrupt-')));}
  assert.deepEqual(h.reads,[BUILTIN_SELECTION_KEY]);
});

test('partial deletion failure is reported and retried on the next load',async()=>{
  const h=harness();let failing=true;const write=h.adapter.setItem;
  h.adapter.setItem=async(key,value)=>{if(failing&&key===LEGACY_KEYS.library)throw Error('disk denied');await write(key,value);};
  const first=await h.repository.load();assert.equal(first.legacyCleared,false);assert.ok(first.warnings.some(w=>w.includes('清除失败')));
  assert.equal(h.values.get(LEGACY_KEYS.library),'private library');
  failing=false;assert.equal((await h.repository.load()).legacyCleared,true);assert.equal(h.values.get(LEGACY_KEYS.library),'[]');
});

test('selection persistence contains only builtin ID and a step bounded by the original template',async()=>{
  const h=harness();await h.repository.load();
  await h.repository.saveSelection({templateId:templates[0].id,frameIndex:59,title:'private',frames:[{note:'edited'}]});
  assert.deepEqual(JSON.parse(h.values.get(BUILTIN_SELECTION_KEY)),{templateId:templates[0].id,frameIndex:3});
  assert.equal(h.values.get(LEGACY_KEYS.draft),'null');assert.equal(h.values.get(LEGACY_KEYS.library),'[]');
  await assert.rejects(h.repository.saveSelection({templateId:'private-id',frameIndex:0}));
});

test('corrupt and unknown selections fall back to a valid builtin and negative steps clamp safely',async()=>{
  const h=harness();
  for(const raw of ['{broken',JSON.stringify({templateId:'private-id',frameIndex:99})]){
    h.values.set(BUILTIN_SELECTION_KEY,raw);const loaded=await h.repository.load();assert.deepEqual(loaded.selection,{templateId:templates[0].id,frameIndex:0});assert.ok(loaded.warnings.length);
  }
  h.values.set(BUILTIN_SELECTION_KEY,JSON.stringify({templateId:templates[4].id,frameIndex:-5}));
  assert.equal((await h.repository.load()).selection.frameIndex,0);
});

test('a selection read failure prevents overwriting unknown progress until a successful reload',async()=>{
  const h=harness();let fails=true;const read=h.adapter.getItem;
  h.adapter.getItem=async key=>{if(fails)throw Error('read failed');return read(key);};
  await h.repository.load();await assert.rejects(h.repository.saveSelection({templateId:templates[0].id,frameIndex:0}),/读取曾失败/);
  fails=false;await h.repository.load();await h.repository.saveSelection({templateId:templates[0].id,frameIndex:2});await h.repository.flush();
  assert.equal(JSON.parse(h.values.get(BUILTIN_SELECTION_KEY)).frameIndex,2);
});

test('queued selection writes preserve snapshots and end with the latest selection',async()=>{
  const h=harness();await h.repository.load();const selection={templateId:templates[0].id,frameIndex:1};
  const first=h.repository.saveSelection(selection);selection.templateId='private-id';selection.frameIndex=59;
  const second=h.repository.saveSelection({templateId:templates[4].id,frameIndex:4});await Promise.all([first,second]);await h.repository.flush();
  assert.deepEqual(JSON.parse(h.values.get(BUILTIN_SELECTION_KEY)),{templateId:templates[4].id,frameIndex:4});
});

test('legacy backup cleanup deletes only exact old-key copies and never other settings or exports',async()=>{
  const web=memory([['halfcourt-draft-v1.corrupt-old','private'],['halfcourt-library-v1.corrupt-old','private'],['halfcourt-library-v10.corrupt-old','other'],[BUILTIN_SELECTION_KEY,'selection']]);
  const files=['halfcourt-draft-v1.txt','halfcourt-library-v1.txt','halfcourt-draft-v1.corrupt-old.txt','halfcourt-library-v1.txt.old.tmp','halfcourt-library-v1.corrupt-old.txt.old.tmp','halfcourt-builtin-selection-v1.txt','halfcourt-library-v10.corrupt-old.txt','../halfcourt-draft-v1.corrupt-old.txt'];
  const deleted=[];const platform=createPlatformAdapters({isNative:()=>true,getLocalStorage:()=>web,filesystem:{async readdir(options){assert.deepEqual(options,{path:'halfcourt/storage',directory:'DATA'});return {files:files.map(name=>({name,type:'file'}))};},async deleteFile(options){deleted.push(options.path);}}});
  assert.deepEqual(await platform.cleanupLegacyExtras(),{webRemoved:2,nativeRemoved:3});
  assert.deepEqual(deleted,['halfcourt/storage/halfcourt-draft-v1.corrupt-old.txt','halfcourt/storage/halfcourt-library-v1.txt.old.tmp','halfcourt/storage/halfcourt-library-v1.corrupt-old.txt.old.tmp']);
  assert.deepEqual([...web.values.keys()],['halfcourt-library-v10.corrupt-old',BUILTIN_SELECTION_KEY]);
});

test('cleanup tolerates missing directories but reports permission failures and retries residual files',async()=>{
  const web=memory();let denied=true;
  const platform=createPlatformAdapters({isNative:()=>true,getLocalStorage:()=>web,filesystem:{async readdir(){return {files:[{name:'halfcourt-draft-v1.corrupt-old.txt',type:'file'}]};},async deleteFile(){if(denied)throw Error('denied');}}});
  await assert.rejects(platform.cleanupLegacyExtras(),/清除失败/);denied=false;assert.equal((await platform.cleanupLegacyExtras()).nativeRemoved,1);
  const missing=createPlatformAdapters({isNative:()=>true,getLocalStorage:()=>web,filesystem:{async readdir(){throw Object.assign(Error('missing'),{code:FILE_NOT_FOUND});}}});
  assert.deepEqual(await missing.cleanupLegacyExtras(),{webRemoved:0,nativeRemoved:0});
});

test('residual cleanup failure is visible at repository load and succeeds on retry',async()=>{
  const h=harness();let fail=true;
  const repository=createBuiltinRepository({adapter:h.adapter,templates,getLegacyStorage:()=>h.legacy,clearLegacyExtras:async()=>{if(fail)throw Error('leftover denied');}});
  assert.equal((await repository.load()).legacyCleared,false);fail=false;assert.equal((await repository.load()).legacyCleared,true);
});
