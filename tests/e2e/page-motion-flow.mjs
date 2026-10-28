import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {SOFT_GLOW_DURATION,sampleSoftGlow} from '../../frontend/src/workspace/soft-glow.js';

export async function runPageMotionFlow({send,evaluate,wait,waitFor,folder}){
  const nav=view=>evaluate(`document.querySelector('[data-view-target="${view}"]').click()`);
  const layers="document.querySelectorAll('[data-page-transition=snapshot],[data-page-transition=glow]').length";
  const settled=()=>waitFor(`!${layers}&&!document.body.dataset.pageTransition`);
  const stats=[];
  for(const [width,height] of [[360,640],[390,844],[844,390],[1024,768],[1280,800],[1440,900]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
    await wait(100); // Allow the metric change's async resize events before starting a transition.
    await nav('lineups');await settled();
    for(const to of ['play','library','archives','lineups']){
      const from=await evaluate('document.body.dataset.view');
      const counts=await evaluate("({ids:[...document.querySelectorAll('[id]')].filter(n=>!n.closest('#lineups-panel')).map(n=>n.id),nav:document.querySelectorAll('[data-view-target]').length})");
      // Read in the same JS task as click, before the first animation frame.
      const state=await evaluate(`(()=>{document.querySelector('[data-view-target="${to}"]').click();const h=document.querySelector('[data-page-transition=snapshot]'),n=document.querySelector('[data-view-target="${to}"]'),r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{view:document.body.dataset.view,running:document.body.dataset.pageTransition,layers:document.querySelectorAll('[data-page-transition=snapshot]').length,from:h?.dataset.from,to:h?.dataset.to,x:Number(h?.dataset.originX),y:Number(h?.dataset.originY),radius:Number(h?.dataset.radius),duration:Number(h?.dataset.duration),capture:Number(h?.dataset.captureMs),nodes:Number(h?.dataset.nodeCount),shadowClosed:h?.shadowRoot===null,hidden:h?.getAttribute('aria-hidden'),pointer:h&&getComputedStyle(h).pointerEvents,navHit:hit===n||n.contains(hit),expectedX:r.x+r.width/2,expectedY:r.y+r.height/2,mask:h?.style.webkitMaskImage,ids:[...document.querySelectorAll('[id]')].map(n=>n.id),nav:document.querySelectorAll('[data-view-target]').length}})()`);
      assert.equal(state.view,to);assert.equal(state.running,'running');assert.equal(state.layers,1);
      assert.equal(state.from,from);assert.equal(state.to,to);assert.equal(state.duration,SOFT_GLOW_DURATION);
      assert.ok(state.shadowClosed&&state.navHit);assert.equal(state.hidden,'true');assert.equal(state.pointer,'none');
      assert.ok(Math.abs(state.x-state.expectedX)<1&&Math.abs(state.y-state.expectedY)<1,'circle uses target navigation center');
      assert.ok(state.radius>=Math.hypot(Math.max(state.x,width-state.x),Math.max(state.y,height-state.y)));
      const retained=await evaluate("[...document.querySelectorAll('[id]')].filter(n=>!n.closest('#lineups-panel')).map(n=>n.id)");
      assert.deepEqual(retained.slice().sort(),counts.ids.slice().sort(),'snapshot preserves fixed application IDs while the shared lineup root legitimately changes view');assert.equal(new Set(state.ids).size,state.ids.length,'snapshot cannot duplicate IDs in application selectors');assert.equal(state.nav,counts.nav);assert.equal(state.nav,4);
      assert.equal(state.mask,'none','initial old page is fully visible');assert.ok(state.capture<250,`snapshot preparation fits interaction budget: ${state.capture}ms`);
      const halo=await evaluate(`(()=>{const h=document.querySelector('[data-page-transition=snapshot]'),g=document.querySelector('[data-page-transition=glow]'),n=document.querySelector('.view-nav');return{count:document.querySelectorAll('[data-page-transition=glow]').length,effect:h?.dataset.effect,feather:Number(h?.dataset.feather),hidden:g?.getAttribute('aria-hidden'),pointer:g&&getComputedStyle(g).pointerEvents,above:Number(getComputedStyle(n).zIndex)>Number(getComputedStyle(g).zIndex),ordered:h?.nextElementSibling===g}})()`);
      assert.equal(halo.count,1);assert.equal(halo.effect,'soft-glow');assert.equal(halo.hidden,'true');assert.equal(halo.pointer,'none');assert.ok(halo.above&&halo.ordered);assert.ok(halo.feather>=36&&halo.feather<=72);
      assert.ok(state.radius>=Math.hypot(Math.max(state.x,width-state.x),Math.max(state.y,height-state.y))+halo.feather/2+1.9,'whole feather band passes final corner');
      stats.push({width,height,from,to,captureMs:state.capture,nodes:state.nodes});
      if(width===390&&to==='play'){
        await wait(290);
        const sample=await evaluate(`(()=>{const h=document.querySelector('[data-page-transition=snapshot]'),g=document.querySelector('[data-page-transition=glow]');return{progress:Number(h?.dataset.progress),radius:Number(h?.dataset.radiusProgress),opacity:Number(h?.dataset.glowOpacity),stage:h?.dataset.stage,mask:h?.style.webkitMaskImage,glow:g?.style.backgroundImage,paintOpacity:Number(g?.style.opacity)}})()`);
        const expected=sampleSoftGlow(sample.progress);
        assert.ok(sample.progress>.2&&sample.progress<.9,'capture is during actual expansion');assert.ok(Math.abs(sample.radius-expected.radiusProgress)<1e-8);assert.ok(Math.abs(sample.opacity-expected.glowOpacity)<1e-8);assert.equal(sample.stage,expected.stage);assert.equal(sample.paintOpacity,sample.opacity);assert.ok(sample.mask.includes('radial-gradient')&&sample.mask.includes('rgba'));assert.ok(sample.glow.includes('radial-gradient'));
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(folder,'hc016-soft-glow-phone-mid.png'),Buffer.from(shot.data,'base64'));
        stats.push({sample});
      }
      await settled();
      assert.equal(await evaluate('document.body.dataset.pageTransitionLastReason'),'complete',`${width}x${height} ${from}->${to} finishes normally`);
      assert.ok(await evaluate("document.documentElement.scrollWidth<=innerWidth+2&&document.documentElement.scrollHeight<=innerHeight+2"));
      if(to==='play')assert.ok(await evaluate("document.querySelector('#storage-status').hidden&&!document.querySelector('#storage-status').textContent"),'normal offline status text removed');
    }
  }
  await evaluate("document.querySelector('[data-view-target=play]').click();document.querySelector('[data-view-target=library]').click();document.querySelector('[data-view-target=lineups]').click()");
  assert.equal(await evaluate('document.body.dataset.view'),'lineups');assert.equal(await evaluate(layers),2);
  await settled();await nav('lineups');assert.equal(await evaluate(layers),0,'same page does not animate');
  await nav('play');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await settled();
  assert.equal(await evaluate('document.body.dataset.pageTransitionLastReason'),'resize');
  await nav('library');await evaluate('window.dispatchEvent(new Event("pagehide"))');await settled();
  assert.equal(await evaluate('document.body.dataset.pageTransitionLastReason'),'pagehide');
  await nav('play');await evaluate("document.querySelector('#open-menu').click()");
  assert.equal(await evaluate(layers),0);assert.equal(await evaluate("document.querySelector('#workspace-menu').open"),true);
  await evaluate("document.querySelector('#close-menu').click()");
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await nav('lineups');assert.equal(await evaluate(layers),0,'reduced motion uses immediate navigation');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await nav('play');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await settled();
  assert.equal(await evaluate('document.body.dataset.pageTransitionLastReason'),'reduced-motion');
  await send('Emulation.setEmulatedMedia',{features:[]});await nav('lineups');await settled();
  await writeFile(path.join(folder,'hc016-motion-metrics.json'),JSON.stringify(stats,null,2)+'\n');
}
