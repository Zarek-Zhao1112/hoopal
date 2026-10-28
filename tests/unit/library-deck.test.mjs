import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutLibraryDeck } from '../../frontend/src/workspace/library-deck-state.js';
import { createLibraryDeck } from '../../frontend/src/workspace/library-deck.js';

const tolerance = 1e-7;
function assertContained(result, width, height) {
  const visible = result.entries.filter(card => !card.hidden);
  for (const card of result.entries) {
    for (const key of ['x','y','width','height','header']) assert.ok(Number.isFinite(card[key]) && card[key] >= 0);
    assert.ok(card.x + card.width <= width + tolerance);
    assert.ok(card.y + card.height <= height + tolerance);
    assert.ok(card.header <= card.height + tolerance);
  }
  for (let i=0;i<visible.length;i++) for(let j=i+1;j<visible.length;j++) {
    const a=visible[i],b=visible[j];
    if(!a.width||!a.height||!b.width||!b.height)continue;
    assert.ok(a.x+a.width<=b.x+tolerance||b.x+b.width<=a.x+tolerance||a.y+a.height<=b.y+tolerance||b.y+b.height<=a.y+tolerance,'visible cards cannot overlap');
  }
}
const areas=[[338,359],[332,497],[335,472],[790,209],[924,398],[1180,590],[1340,690]];
test('all nine offense or four defense cards stay in six measured regions, with a usable active body',()=>{
  for(const [width,height]of areas)for(const count of[4,9])for(let selected=-1;selected<count;selected++){
    const result=layoutLibraryDeck({width,height,count,selected});
    assert.equal(result.entries.length,count);assertContained(result,width,height);
    if(selected<0){assert.ok(result.entries.every(card=>!card.hidden&&card.height===card.header));assert.ok(result.entries.every(card=>card.header>=32));}
    else {const card=result.entries[selected];assert.ok(!card.hidden);assert.ok(card.height-card.header>=150,'active body retains room for the real court and CTA, including short wide areas');}
  }
});
test('approved regular portrait keeps nine titles while short portrait explicitly overlays one card',()=>{
  for(const selected of[0,4,8]){
    const regular=layoutLibraryDeck({width:332,height:497,count:9,selected});
    assert.equal(regular.layout,'portrait');assert.ok(regular.strip>=32);assert.ok(regular.entries.every(card=>!card.hidden));
    for(let i=1;i<9;i++)assert.ok(regular.entries[i].y>=regular.entries[i-1].y+regular.entries[i-1].height);
    const short=layoutLibraryDeck({width:338,height:359,count:9,selected});
    assert.equal(short.layout,'overlay');assert.equal(short.entries.filter(card=>!card.hidden).length,1);assert.equal(short.entries[selected].height,359);assert.equal(short.entries[selected].header,40);
  }
  assert.equal(layoutLibraryDeck({width:335,height:430,count:9,selected:8}).layout,'portrait');
  assert.equal(layoutLibraryDeck({width:335,height:429,count:9,selected:8}).layout,'overlay');
  assert.equal(layoutLibraryDeck({width:338,height:359,count:4,selected:2}).layout,'portrait','four-card defense remains a regular list');
});
test('wide layouts retain catalog order, with one or two right title columns as needed',()=>{
  const collapsed=layoutLibraryDeck({width:790,height:209,count:9});
  assert.equal(collapsed.layout,'wide');assert.equal(collapsed.entries[0].y,collapsed.entries[1].y);assert.ok(collapsed.entries[0].x<collapsed.entries[1].x);
  for(const [width,height,twoColumns]of[[790,209,true],[924,398,false]]){
    const opened=layoutLibraryDeck({width,height,count:9,selected:5});const active=opened.entries[5],others=opened.entries.filter((_,i)=>i!==5);
    assert.equal(active.x,0);assert.equal(active.y,0);assert.equal(active.height,height);assert.ok(others.every(card=>card.x>active.width));
    assert.equal(new Set(others.map(card=>card.x)).size,twoColumns?2:1);
    assert.ok(others.every(card=>card.header>=36));assertContained(opened,width,height);
  }
});
test('invalid and zero geometry is bounded, detached, finite and capped at nine',()=>{
  for(const options of[undefined,null,{}, {width:0,height:400,count:9},{width:338,height:0,count:4},{width:NaN,height:Infinity,count:9},{width:Symbol('bad'),height:{},count:Symbol('bad')}]){
    const result=layoutLibraryDeck(options);assert.equal(result.strip,0);assert.equal(result.gap,0);assert.ok(result.entries.length<=9);assert.ok(result.entries.every(card=>['x','y','width','height','header'].every(key=>card[key]===0)));
  }
  assert.equal(layoutLibraryDeck({width:338,height:497,count:999}).entries.length,9);
  for(const selected of[null,NaN,9,-1,.5,'2',Infinity])assert.ok(layoutLibraryDeck({width:338,height:497,count:9,selected}).entries.every(card=>card.height===card.header&&!card.hidden));
  for(const [width,height]of[[1,1],[17,23],[300,100],[599,180],[600,180],[10000,10000]])for(const count of[1,4,9])for(let selected=-1;selected<count;selected++)assertContained(layoutLibraryDeck({width,height,count,selected}),width,height);
  const input={width:332,height:497,count:9,selected:7},first=layoutLibraryDeck(input),snapshot=structuredClone(first);first.entries[7].height=999;
  assert.deepEqual(layoutLibraryDeck(input),snapshot);assert.deepEqual(input,{width:332,height:497,count:9,selected:7});
});

// Ancestry, event and focus fixture. Browser geometry and native focus are
// independently checked by the shared Chrome runner, not simulated here.
class DeckElement {
  constructor(tag, document) {Object.assign(this,{tagName:tag,ownerDocument:document,children:[],dataset:{},attributes:{},listeners:{},hidden:false,disabled:false,textContent:'',style:{setProperty(){}},classList:{add(){}}});}
  append(...nodes){for(const node of nodes)this.insertBefore(node,null);}
  insertBefore(node,before){node.remove();node.parentElement=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,node);}
  remove(){if(this.parentElement){const parent=this.parentElement;parent.children.splice(parent.children.indexOf(this),1);this.parentElement=null;}}
  replaceChildren(...nodes){for(const child of[...this.children])child.remove();this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,listener,options){(this.listeners[type]??=[]).push({listener,capture:options===true});}
  removeEventListener(type,listener){this.listeners[type]=(this.listeners[type]??[]).filter(item=>item.listener!==listener);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  focus(){if(!this.disabled)this.ownerDocument.activeElement=this;}
  getBoundingClientRect(){return this.ownerDocument.area;}
  click(force=false){if(force||!this.disabled){const event={stopped:false,stopImmediatePropagation(){this.stopped=true;}};for(const {listener} of [...this.listeners.click??[]].sort((a,b)=>Number(b.capture)-Number(a.capture))){listener(event);if(event.stopped)break;}}}
}
function deckFixture(onPlay=async()=>true,{reduced=true,visible=true}={}){
  const timers=new Map();let serial=0;
  const motion={matches:reduced};
  const document={area:{width:332,height:497},createElement(tag){return new DeckElement(tag,this);},defaultView:{matchMedia:()=>motion,addEventListener(){},clearTimeout(id){timers.delete(id);},setTimeout(fn){timers.set(++serial,fn);return serial;}}};
  const runtimes=new Map(),runtimeCalls=[];
  const makePreview=(template,button)=>{
    let playing=false,position=0,destroyed=false;
    const record=kind=>runtimeCalls.push({id:template.id,kind,disabled:button.disabled});
    const runtime={
      start(){record('start');if(!destroyed&&!button.disabled)playing=true;},
      pause(){record('pause');playing=false;},
      reset(){record('reset');playing=false;position=0;},
      destroy(){record('destroy');playing=false;destroyed=true;button.removeEventListener('click',tap);},
      get state(){return{playing,position,destroyed};},setPosition(value){position=value;},
    };
    const tap=()=>{if(button.disabled||destroyed)return;if(playing)runtime.pause();else runtime.start();};
    button.addEventListener('click',tap);button.append(document.createElement('svg'));runtimes.set(template.id,runtime);record('create');return runtime;
  };
  const root=document.createElement('div'),deck=createLibraryDeck({root,makePreview,onPlay,visible});
  const templates=Array.from({length:9},(_,i)=>({id:'t-'+i,title:'配合 '+i,category:'传切',mode:'3v3',description:'初始配合'}));
  const all=(node=root)=>node.children.flatMap(child=>[child,...all(child)]),cards=()=>root.children.filter(node=>node.className==='library-card');
  const heading=id=>all().find(node=>node.dataset.templateId===id),play=id=>all().find(node=>node.dataset.playTemplate===id);
  const court=id=>cards().find(card=>card.dataset.cardId===id)?.children[1].children.find(node=>node.className==='library-card-court');
  const render=options=>deck.render({templates,...options});
  return{root,document,deck,templates,all,cards,heading,play,court,render,timers,motion,runtimes,runtimeCalls};
}
test('all nine cards share one DOM page; normal renders keep identity and only CTA loads',()=>{
  const calls=[],f=deckFixture(async id=>{calls.push(id);return true;});f.render({activeTemplateId:'t-7'});
  assert.equal(f.cards().length,9);assert.equal(f.root.dataset.total,'9');assert.equal(f.root.dataset.count,'9');assert.equal(f.root.dataset.paged,'false');assert.equal(f.deck.page,0);assert.equal(f.deck.pages,1);
  assert.ok(!f.all().some(node=>node.dataset.libraryPage));
  assert.deepEqual(f.cards().map(card=>card.children[0].children[0].textContent),['01','02','03','04','05','06','07','08','09']);
  assert.deepEqual(f.cards().filter(card=>card.dataset.active==='true').map(card=>card.dataset.cardId),['t-7']);
  const retained=f.heading('t-7');retained.click();f.render({activeTemplateId:'t-7'});assert.equal(f.heading('t-7'),retained);assert.equal(f.deck.expandedId,'t-7');assert.deepEqual(calls,[]);
  f.heading('t-8').click();assert.equal(f.deck.expandedId,'t-8');assert.equal(f.cards().filter(card=>!card.children[1].hidden).length,1);f.heading('t-8').click();assert.equal(f.deck.expandedId,'');
  f.heading('t-2').click();f.deck.reset();assert.equal(f.deck.expandedId,'');
});
test('resize overlay moves hidden focus to current heading; hidden callbacks cannot select or load',()=>{
  const calls=[],f=deckFixture(async id=>{calls.push(id);return true;});f.render();f.heading('t-8').click();f.heading('t-0').focus();f.document.area.height=359;f.deck.refreshLayout();
  assert.equal(f.root.dataset.layout,'overlay');assert.equal(f.document.activeElement,f.heading('t-8'));
  for(const card of f.cards()){
    const active=card.dataset.cardId==='t-8',heading=card.children[0];assert.equal(card.attributes['aria-hidden'],String(!active));assert.equal(heading.disabled,!active);assert.equal(heading.tabIndex,active?0:-1);assert.equal(card.style.visibility,active?'visible':'hidden');
  }
  assert.equal(f.heading('t-8').children.find(node=>node.className==='library-card-return').hidden,false);
  f.heading('t-0').click(true);f.play('t-0').click(true);assert.equal(f.deck.expandedId,'t-8');assert.deepEqual(calls,[]);
  f.heading('t-8').click();assert.equal(f.deck.expandedId,'');assert.ok(f.cards().every(card=>card.children[0].disabled===false&&card.children[0].tabIndex===0&&card.attributes['aria-hidden']==='false'));
  f.heading('t-1').click();f.document.area.height=497;f.deck.refreshLayout();assert.equal(f.root.dataset.layout,'portrait');assert.equal(f.deck.expandedId,'t-1');assert.ok(f.cards().every(card=>!card.children[0].disabled));
});
test('group changes invalidate detached nodes while a same-group render never closes the current card',()=>{
  const calls=[],f=deckFixture(async id=>{calls.push(id);return true;});f.render();f.heading('t-0').click();const oldHeading=f.heading('t-0'),oldPlay=f.play('t-0');
  f.render({templates:f.templates.slice(0,4)});assert.equal(f.cards().length,4);assert.equal(f.deck.expandedId,'');oldHeading.click(true);oldPlay.click(true);assert.equal(f.deck.expandedId,'');assert.deepEqual(calls,[]);
  f.heading('t-0').click();f.render({templates:f.templates.slice(0,4)});assert.equal(f.deck.expandedId,'t-0');
});
test('pending and external busy guard every heading including overlay return, preserving failed load for one retry',async()=>{
  let finish,calls=0;const f=deckFixture(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});f.document.area.height=359;f.render();f.heading('t-8').click();
  f.deck.setBusy(true);assert.ok(f.cards().every(card=>card.children[0].disabled));f.heading('t-8').click(true);assert.equal(f.deck.expandedId,'t-8');assert.equal(f.play('t-8').disabled,true);
  f.deck.setBusy(false);f.play('t-8').click();f.play('t-8').click(true);f.heading('t-8').click(true);f.heading('t-2').click(true);f.render();
  assert.equal(calls,1);assert.equal(f.deck.expandedId,'t-8');assert.ok(f.cards().every(card=>card.children[0].disabled));
  finish(false);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.deck.expandedId,'t-8');assert.equal(f.play('t-8').disabled,false);assert.equal(f.heading('t-0').disabled,true);
  f.play('t-8').click();assert.equal(calls,2);finish(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.heading('t-8').disabled,false);
});
test('thrown load failure keeps card/error text for explicit retry without mutating another group',async()=>{
  let calls=0;const f=deckFixture(async()=>{if(++calls===1)throw Error('原文保护失败');return true;});f.render();f.heading('t-8').click();const runtime=f.runtimes.get('t-8');runtime.setPosition(2.1);f.play('t-8').click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.deck.expandedId,'t-8');const body=f.cards()[8].children[1];assert.equal(body.children.find(node=>node.className==='library-card-summary').textContent,'原文保护失败');
  assert.equal(runtime.state.playing,false);assert.equal(runtime.state.position,2.1);assert.equal(f.court('t-8').disabled,false,'thrown failures preserve the paused court for an explicit continue');
  f.play('t-8').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,2);assert.equal(f.deck.expandedId,'t-8');
});
test('rapid toggles, resize and reduced motion settle without stale timer state',()=>{
  const f=deckFixture(undefined,{reduced:false});f.render();f.heading('t-0').click();const stale=[...f.timers.values()][0];f.heading('t-8').click();assert.equal(f.root.dataset.transitioning,'true');stale();assert.equal(f.root.dataset.transitioning,'true');
  for(const fn of f.timers.values())fn();assert.equal(f.root.dataset.transitioning,'false');assert.equal(f.deck.expandedId,'t-8');f.document.area={width:790,height:209};f.deck.refreshLayout();assert.equal(f.root.dataset.layout,'wide');assert.equal(f.root.dataset.transitioning,'false');
  f.motion.matches=true;f.heading('t-4').click();assert.equal(f.root.dataset.transitioning,'false');assert.equal(f.deck.expandedId,'t-4');assert.ok(f.cards().every(card=>card.style.transition==='none'));
});

test('preview factory is lazy and starts only after enabling; same-group render and resize preserve pause/position',()=>{
  const f=deckFixture();f.render();assert.equal(f.runtimes.size,0);
  f.heading('t-8').click();const runtime=f.runtimes.get('t-8');assert.ok(runtime.state.playing);assert.equal(f.court('t-8').tagName,'button');assert.equal(f.court('t-8').dataset.action,'toggle-preview');
  assert.equal(f.runtimeCalls.find(call=>call.kind==='start').disabled,false,'reset/start follow actual enable');
  runtime.setPosition(2.4);f.court('t-8').click();assert.equal(runtime.state.playing,false);const calls=f.runtimeCalls.length;
  f.render();f.document.area.height=359;f.deck.refreshLayout();assert.equal(f.runtimes.get('t-8'),runtime);assert.equal(runtime.state.position,2.4);assert.equal(runtime.state.playing,false);assert.equal(f.runtimeCalls.length,calls,'ordinary render and resize never restart/reset a preview');
  f.court('t-8').click();assert.equal(runtime.state.playing,true);
  f.heading('t-8').click();assert.equal(runtime.state.playing,false);assert.equal(runtime.state.position,0);
  f.heading('t-8').click();assert.equal(f.runtimes.size,1);assert.equal(runtime.state.playing,true);assert.equal(runtime.state.position,0,'reopen starts from the original frame');
});

test('switch, hide, background pause and group destruction own every runtime lifecycle',()=>{
  const f=deckFixture();f.render();f.heading('t-0').click();const first=f.runtimes.get('t-0');first.setPosition(1.6);
  f.heading('t-8').click();assert.equal(first.state.playing,false);assert.equal(first.state.position,0);const last=f.runtimes.get('t-8');last.setPosition(2.3);
  f.deck.setVisible(false);assert.equal(last.state.playing,false);assert.equal(last.state.position,2.3);assert.ok(f.cards().every(card=>card.children[0].disabled));
  const oldCourt=f.court('t-8');oldCourt.click(true);assert.equal(last.state.playing,false);
  f.deck.setVisible(true);assert.equal(last.state.playing,false,'returning to library does not auto-resume');assert.equal(last.state.position,2.3);f.court('t-8').click();assert.equal(last.state.playing,true);
  f.deck.pause();assert.equal(last.state.playing,false);assert.equal(last.state.position,2.3,'background hook keeps current position');
  f.render({templates:f.templates.slice(0,4)});assert.equal(first.state.destroyed,true);assert.equal(last.state.destroyed,true);oldCourt.click(true);assert.equal(last.state.playing,false);
  f.heading('t-0').click();const current=f.runtimes.get('t-0');assert.notEqual(current,first);assert.ok(current.state.playing);oldCourt.click(true);assert.ok(current.state.playing,'detached button cannot mutate the new group');
});

test('initially hidden deck cannot start; busy/failed CTA pauses before disabling and never resumes by itself',async()=>{
  const hidden=deckFixture(undefined,{visible:false});hidden.render();hidden.heading('t-0').click(true);assert.equal(hidden.runtimes.size,0);assert.equal(hidden.deck.expandedId,'');hidden.deck.setVisible(true);hidden.heading('t-0').click();assert.ok(hidden.runtimes.get('t-0').state.playing);
  let finish;const f=deckFixture(()=>new Promise(resolve=>{finish=resolve;}));f.render();f.heading('t-8').click();const runtime=f.runtimes.get('t-8');runtime.setPosition(1.8);f.runtimeCalls.length=0;
  f.play('t-8').click();assert.equal(runtime.state.playing,false);assert.equal(f.runtimeCalls[0].kind,'pause');assert.equal(f.runtimeCalls[0].disabled,false,'busy pauses before disabling the live court');assert.equal(f.court('t-8').disabled,true);f.court('t-8').click(true);assert.equal(runtime.state.playing,false);
  finish(false);await new Promise(resolve=>setImmediate(resolve));assert.equal(runtime.state.position,1.8);assert.equal(runtime.state.playing,false);assert.equal(f.deck.expandedId,'t-8');assert.equal(f.court('t-8').disabled,false);assert.equal(f.play('t-8').textContent,'进入训练场');
  f.court('t-8').click();assert.equal(runtime.state.playing,true,'explicit tap may continue after failure');f.deck.setBusy(true);assert.equal(runtime.state.playing,false);f.deck.setBusy(false);assert.equal(runtime.state.playing,false,'busy unlock is not autoplay');
});
