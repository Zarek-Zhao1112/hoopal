import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { libraryControls, assertNoPageOverflow } from './library-flow-helpers.mjs';

/** Three primary pages retain a shared card line; secondary routes are tested separately. */
export async function runPageLayoutFlow(context) {
  const { send, evaluate, wait, folder } = context, c = libraryControls(context), metrics = [];
  const facts = () => evaluate("({archive:localStorage.getItem('halfcourt-lineups-v1'),selection:localStorage.getItem('halfcourt-builtin-selection-v1'),template:document.querySelector('#template-picker').value,progress:document.querySelector('#timeline-scrub').value,players:document.querySelector('#players-layer').innerHTML})");
  await c.nav('play'); const before = await facts();
  for (const [width, height] of [[360, 640], [390, 844], [844, 390], [1024, 768], [1280, 800], [1440, 900]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 }); await wait(80);
    await c.teams(); await c.nav('play');
    assert.equal(await evaluate("document.querySelector('#lineups-panel').getClientRects().length"), 0, 'management root must be hidden after entering training');
    assert.equal(await evaluate("document.querySelector('#team-management-header')?.getClientRects().length||0"), 0, 'management title must not leak above the training court');
    await c.nav('lineups');
    assert.equal(await evaluate("document.querySelector('#team-management-header')?.getClientRects().length||0"), 0, 'returning to locker replaces the management header');
    for (const view of ['lineups', 'play', 'archives']) {
      await c.nav(view);
      const g = await evaluate(`(()=>{const selector=${JSON.stringify(view)}==='lineups'?'.lineups-panel>.lineup-main-empty,.lineups-panel>.lineup-profile-card':${JSON.stringify(view)}==='play'?'.training-panel':'.lineup-archives-card';const p=document.querySelector(selector),r=p.getBoundingClientRect(),nav=document.querySelector('.view-nav').getBoundingClientRect();return{view:${JSON.stringify(view)},width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,box:r.toJSON(),nav:nav.toJSON(),navCount:document.querySelectorAll('[data-view-target]').length,brand:document.querySelector('#lineup-brand-header').getClientRects().length>0,controls:[...p.querySelectorAll('button,select,input[type=range],label.toggle-label,label.loop-label')].filter(n=>!n.disabled&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden').map(n=>{const r=n.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id:n.id||n.dataset.action||n.className,fit:r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:h===n||n.contains(h)}})}})()`);
      const tallPhone = width < 600 && height > 700;
      assertNoPageOverflow(g); assert.equal(g.navCount, 3); assert.equal(g.brand, view === 'lineups' || tallPhone); assert.ok(g.box.bottom <= g.nav.top + 1); assert.ok(g.box.top >= (height < 500 ? 48 : 85));
      if (view === 'play') {
        const headings = await evaluate("[...document.querySelectorAll('#primary-training-title,.training-header>.workspace-card-heading')].filter(title=>title.getClientRects().length).map(title=>({text:title.textContent,inside:Boolean(title.closest('.training-panel'))}))");
        assert.deepEqual(headings, [{text:'训练场',inside:tallPhone}], 'one training heading appears in the expected position');
      }
      for (const control of g.controls) assert.ok(control.fit && control.hit, `${width}x${height}/${view}: ${JSON.stringify(control)}`);
      if (view === 'play') { await c.click('#open-menu'); await context.waitFor("document.querySelector('#workspace-menu').open"); await c.click('#close-menu'); }
      assert.deepEqual(await facts(), before, 'layout and navigation preserve both saved records and the actual paused board'); metrics.push(g);
    }
  }
  await c.nav('lineups'); await writeFile(path.join(folder, 'hc059-primary-layouts.json'), JSON.stringify(metrics, null, 2));
}
