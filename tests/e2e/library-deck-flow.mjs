import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {templates} from '../../shared/templates.js';
import {findLibraryCard} from './library-deck-helpers.mjs';

export async function runLibraryDeckFlow({send,evaluate,wait,waitFor,folder}){
  const nav=async view=>{await evaluate(`document.querySelector('[data-view-target=${view}]').click()`);await waitFor('!document.body.dataset.pageTransition')};
  const settle=()=>waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
  const configure=async(mode,kind)=>{await evaluate(`(()=>{const n=document.querySelector('#mode');n.value='${mode}';n.dispatchEvent(new Event('change'));document.querySelector('[data-kind-target=${kind}]').click()})()`);await wait(100)};
  const click=async selector=>{
    await settle();
    const point=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n||n.disabled||n.closest('button')?.disabled)throw Error('Unavailable library control');const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);if(!r.width||!r.height||!(hit===n||n.contains(hit)))throw Error('Library control cannot be hit: '+${JSON.stringify(selector)});return{x,y}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1});await settle();
  };
  const open=async id=>{
    const selector=await findLibraryCard({evaluate,waitFor},id);
    const otherOverlay=await evaluate(`(()=>{const d=document.querySelector('#template-list').dataset;return d.layout==='overlay'&&d.expandedId&&d.expandedId!==${JSON.stringify(id)}})()`);
    if(otherOverlay)await click('.library-card-return:not([hidden])');
    await click(selector);
  };
  const close=async id=>{
    await click(await evaluate("document.querySelector('#template-list').dataset.layout==='overlay'")?'.library-card-return:not([hidden])':`.library-card-heading[data-template-id="${id}"]`);
    assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'');
  };
  const screenshot=async name=>{const p=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,name),Buffer.from(p.data,'base64'))};
  const facts=()=>evaluate(`({source:document.querySelector('#template-picker').value,title:document.querySelector('#play-title').value,step:document.querySelector('#frame-counter').textContent,progress:document.querySelector('#timeline-scrub').value,players:document.querySelector('#players-layer').innerHTML,selection:localStorage.getItem('halfcourt-builtin-selection-v1'),archive:localStorage.getItem('halfcourt-lineups-v1')})`);
  await nav('library');const before=await facts();
  assert.ok(await evaluate("!document.querySelector('#template-page-prev,#template-page-next,#deck-toggle,[data-library-page]')"));
  for(const mode of ['3v3','4v4'])for(const kind of ['offense','defense']){
    await configure(mode,kind);const list=templates.filter(t=>t.mode===mode&&t.kind===kind);
    assert.deepEqual(await evaluate("[...document.querySelectorAll('.library-card-heading')].map(n=>n.dataset.templateId)"),list.map(t=>t.id));
    assert.deepEqual(await evaluate("(()=>{const d=document.querySelector('#template-list').dataset;return[d.count,d.total,d.paged]})()"),[String(list.length),String(list.length),'false']);
    assert.equal(await evaluate("document.querySelectorAll('[data-library-page]').length"),0);
    assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'');
    assert.ok(await evaluate("[...document.querySelectorAll('.library-card-body')].every(n=>n.hidden)"));
    for(const t of list){await open(t.id);assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),t.id);assert.equal(await evaluate("document.querySelectorAll('.library-card-body:not([hidden])').length"),1)}
    await open(list.at(-1).id);assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'');
  }
  assert.deepEqual(await facts(),before,'browsing modes, categories and all titles does not change current play, progress or recommendation source');
  const metrics=[];
  for(const [width,height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});await wait(120);
    for(const mode of ['3v3','4v4']){
      await configure(mode,'offense');
      assert.deepEqual(await evaluate("[...document.querySelectorAll('.library-card-index')].map(n=>n.textContent)"),Array.from({length:9},(_,i)=>String(i+1).padStart(2,'0')));
      await checkLayout(width,height,`${mode}-collapsed`);
      await screenshot(`hc031-${width}x${height}-${mode}-collapsed.png`);
      for(const template of templates.filter(t=>t.mode===mode&&t.kind==='offense')){
        await open(template.id);assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),template.id);
        await checkLayout(width,height,`${mode}-${template.id}`);
        if(template.id===(mode==='3v3'?'post-split':'screen-the-screener'))await screenshot(`hc031-${width}x${height}-${mode}-expanded.png`);
        await close(template.id);await checkLayout(width,height,`${mode}-closed-${template.id}`);
      }
      await configure(mode,'defense');
      assert.equal(await evaluate("document.querySelectorAll('.library-card-heading').length"),4);
      await checkLayout(width,height,`${mode}-defense-collapsed`);
      const last=templates.filter(t=>t.mode===mode&&t.kind==='defense').at(-1);
      await open(last.id);await checkLayout(width,height,`${mode}-${last.id}`);await close(last.id);
      assert.deepEqual(await facts(),before,`${width}x${height} ${mode}: all browsing keeps play/progress/source and storage bytes`);
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(120);
  await configure('3v3','offense');await open('pick-roll');
  const headingHandle=(await send('Runtime.evaluate',{expression:"document.querySelector('[data-template-id=pick-roll]')",objectGroup:'hc031-deck'})).result.objectId;
  try{
    await evaluate("document.querySelector('#timeline-scrub').dispatchEvent(new Event('change'))");await settle();
    assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'pick-roll','same-group render keeps expansion');
    assert.equal((await send('Runtime.callFunctionOn',{objectId:headingHandle,functionDeclaration:"function(){return this===document.querySelector('[data-template-id=pick-roll]')&&this.isConnected}",returnByValue:true})).result.value,true,'same-group render retains live title nodes');
    assert.deepEqual(await facts(),before,'same paused step render does not change data');
  }finally{await send('Runtime.releaseObjectGroup',{objectGroup:'hc031-deck'})}
  await evaluate("document.querySelector('[data-template-id=slip-screen]').focus()");
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:1,mobile:true});await wait(120);await settle();
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.layout"),'overlay');
  assert.equal(await evaluate("document.activeElement?.dataset.templateId"),'pick-roll','resize moves focus off the now concealed title');
  await checkLayout(360,640,'resized-overlay');await close('pick-roll');await checkLayout(360,640,'returned-from-overlay');
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await wait(120);
  await evaluate("document.querySelector('[data-template-id=pick-roll]').click();document.querySelector('[data-template-id=slip-screen]').click();document.querySelector('[data-template-id=offball-flare]').click()");await settle();
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'offball-flare','rapid wide-title actions converge to latest');
  await checkLayout(844,390,'rapid-latest');await close('offball-flare');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await open('pick-roll');await open('pick-roll');assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await open('give-go');await nav('play');await nav('library');
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'','reentering library starts collapsed');
  await open('post-split');await configure('4v4','offense');
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'','mode change collapses');
  await open('hammer');await configure('4v4','defense');
  assert.equal(await evaluate("document.querySelector('#template-list').dataset.expandedId"),'','kind change collapses');
  assert.deepEqual(await facts(),before,'resize, rapid actions, reduced motion and resets do not load a Play');
  await configure('3v3','offense');
  await open('give-go');
  await evaluate("document.querySelector('[data-play-template=give-go]').click();document.querySelector('[data-play-template=give-go]').click()");
  await waitFor("document.body.dataset.view==='play'&&!document.body.classList.contains('is-loading')&&document.querySelector('#template-picker').value==='give-go'");
  await waitFor("document.querySelector('#play-toggle').getAttribute('aria-pressed')==='true'");
  await waitFor("Number(document.querySelector('#timeline-scrub').value)>1");
  await evaluate("document.querySelector('#play-toggle').click()");await nav('lineups');
  await writeFile(path.join(folder,'hc031-library-metrics.json'),JSON.stringify(metrics,null,2)+'\n');

  async function checkLayout(width,height,stage){
    const value=await evaluate(`(()=>{
      const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]');
      const root=document.querySelector('#template-list'),rect=n=>n.getBoundingClientRect().toJSON();
      const nodes=[...document.querySelectorAll('.library-card-heading,.library-card-court,.library-card-play,.library-card-return:not([hidden]),.view-nav button')].filter(visible);
      return{width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,deck:rect(root),layout:root.dataset.layout,count:Number(root.dataset.count),expanded:root.dataset.expandedId,
        controls:nodes.map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id:n.dataset.templateId||n.dataset.playTemplate||n.dataset.viewTarget||n.dataset.action||'return',rect:r.toJSON(),disabled:Boolean(n.disabled||n.closest('button')?.disabled),hit:hit===n||n.contains(hit)}}),
        cards:[...root.querySelectorAll('.library-card')].map(n=>({id:n.dataset.cardId,rect:rect(n),visible:visible(n),aria:n.getAttribute('aria-hidden'),headingDisabled:n.querySelector('.library-card-heading').disabled,headingTab:n.querySelector('.library-card-heading').tabIndex,playDisabled:n.querySelector('.library-card-play').disabled,playTab:n.querySelector('.library-card-play').tabIndex,bodyHidden:n.querySelector('.library-card-body').hidden})),
        open:[...root.querySelectorAll('.library-card-body:not([hidden])')].map(n=>({body:rect(n),court:rect(n.querySelector('.library-card-court')),cta:rect(n.querySelector('.library-card-play'))}))};
    })()`);
    assert.ok(value.sw<=width+2&&value.sh<=height+2,`${stage} page overflow ${JSON.stringify(value)}`);
    assert.ok(['portrait','wide','overlay'].includes(value.layout));assert.equal(value.cards.length,value.count);
    const shown=value.cards.filter(card=>card.visible);
    if(value.layout==='overlay'){
      assert.ok(value.expanded&&value.count===9&&value.deck.height<430);
      assert.deepEqual(shown.map(card=>card.id),[value.expanded]);
      assert.ok(value.controls.some(n=>n.id==='return'),'overlay has a separately hittable return span');
      for(const card of value.cards.filter(card=>!card.visible)){
        assert.equal(card.aria,'true');assert.equal(card.headingDisabled,true);assert.equal(card.headingTab,-1);
        assert.equal(card.playDisabled,true);assert.equal(card.playTab,-1);assert.equal(card.bodyHidden,true);
      }
      assert.equal(await evaluate("(()=>{const n=document.querySelector('.library-card[aria-hidden=true] .library-card-heading');if(n){n.click();n.focus()}return document.querySelector('#template-list').dataset.expandedId})()"),value.expanded,'stale hidden titles cannot receive clicks');
      assert.ok(await evaluate("!document.activeElement.closest('.library-card[aria-hidden=true]')"),'hidden titles cannot acquire focus');
    }else assert.equal(shown.length,value.count,'all titles stay visible in portrait/wide');
    if(width===390&&height===844&&value.count===9&&value.expanded){assert.ok(value.deck.height>=430);assert.equal(value.layout,'portrait','normal portrait expansion retains nine titles')}
    for(const n of value.controls){
      assert.ok(n.rect.width>0&&n.rect.height>0&&n.rect.x>=-1&&n.rect.y>=-1&&n.rect.right<=width+1&&n.rect.bottom<=height+1,`${stage} outside ${JSON.stringify(n)}`);
      assert.ok(n.hit,`${stage} control must be hit ${JSON.stringify(n)}`);assert.equal(n.disabled,false,`${stage}: visible control enabled`);
    }
    for(const card of shown)assert.ok(card.rect.x>=value.deck.x-1&&card.rect.right<=value.deck.right+1&&card.rect.y>=value.deck.y-1&&card.rect.bottom<=value.deck.bottom+1,`${stage}: card outside measured deck`);
    if(value.expanded){
      assert.equal(value.open.length,1);const opened=value.open[0];
      assert.ok(opened.court.width>50&&opened.court.height>=70&&opened.cta.height>=30,`${stage}: usable preview and CTA`);
      assert.ok(opened.body.bottom<=value.deck.bottom+1&&opened.cta.bottom<=value.deck.bottom+1);
      if(value.layout==='wide'){
        const selected=shown.find(card=>card.id===value.expanded),others=shown.filter(card=>card.id!==value.expanded);
        assert.ok(others.every(card=>card.rect.x>=selected.rect.right),'wide preview is left of remaining titles');
        assert.ok(new Set(others.map(card=>Math.round(card.rect.x))).size<=2,'wide titles use one or two columns');
      }
    }else{
      assert.equal(value.open.length,0);
      assert.equal(value.controls.filter(n=>!['lineups','play','library','archives'].includes(n.id)).length,value.count,'all collapsed titles are directly actionable');
    }
    metrics.push({stage,...value});
  }
}
