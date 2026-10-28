import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { templates } from '../../shared/templates.js';

/** Read-only layout regression. The shared runner owns Chrome and its profile. */
export async function runPageLayoutFlow({ send, evaluate, wait, waitFor, folder }) {
  const sizes = [[360, 640, 96], [390, 844, 116], [844, 390, 68], [1024, 768, 120], [1280, 800, 120], [1440, 900, 120]];
  const metrics = [];
  const settled = () => waitFor("!document.body.dataset.pageTransition&&!document.body.classList.contains('is-loading')&&!document.querySelector('dialog[open]')");
  const deckSettled = () => waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
  const facts = () => evaluate(`({
    template:document.querySelector('#template-picker').value,
    title:document.querySelector('#play-title').value,
    progress:document.querySelector('#timeline-scrub').value,
    step:document.querySelector('#frame-counter').textContent,
    players:document.querySelector('#players-layer').innerHTML,
    selection:localStorage.getItem('halfcourt-builtin-selection-v1'),
    lineups:localStorage.getItem('halfcourt-lineups-v1')
  })`);
  const checkUnchanged = async (label, expected) => assert.deepEqual(await facts(), expected, label);
  const click = async selector => {
    const point = await evaluate(`(()=>{
      const node=document.querySelector(${JSON.stringify(selector)});
      if(!node||node.disabled)throw new Error('Missing or disabled control: '+${JSON.stringify(selector)});
      const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
      if(!r.width||!r.height||!(hit===node||node.contains(hit)))throw new Error('Control cannot be hit: '+${JSON.stringify(selector)});
      return{x,y};
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
  };
  const nav = async view => {
    await click(`[data-view-target="${view}"]`);
    await waitFor(`document.body.dataset.view===${JSON.stringify(view)}`);
    await settled();
  };
  const setCatalog = async (mode, kind) => {
    await evaluate(`(()=>{const n=document.querySelector('#mode');n.value=${JSON.stringify(mode)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await click(`[data-kind-target="${kind}"]`);
    await deckSettled();
  };
  const screenshot = async name => {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path.join(folder, name), Buffer.from(shot.data, 'base64'));
  };

  await settled();
  assert.equal(await evaluate("document.querySelector('#play-toggle').getAttribute('aria-pressed')"), 'false', 'layout flow starts with playback paused');
  await nav('play');
  const baseline = await facts();
  const actualMode = templates.find(template => template.id === baseline.template)?.mode;
  assert.ok(actualMode, 'the real current play is a known builtin');
  const modeHandle = (await send('Runtime.evaluate', { expression: "document.querySelector('#mode')", objectGroup: 'hc023-layout' })).result.objectId;
  assert.ok(modeHandle, 'retain the original shared mode node for identity checks');
  await nav('library');
  const originalCatalog = await evaluate("({mode:document.querySelector('#mode').value,kind:document.body.dataset.catalogKind})");
  await checkUnchanged('opening the catalog does not change saved play or roster', baseline);

  try {
    for (const [width, height, expectedTop] of sizes) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1000 });
      await wait(120);
      await nav('lineups');
      await checkLayout(width, height, expectedTop, 'lineups', 'main');
      await screenshot(`hc031-${width}x${height}-locker.png`);

      await nav('play');
      await checkMode('play-header-controls', actualMode);
      await checkLayout(width, height, expectedTop, 'play', 'paused');
      const pager=await evaluate("(()=>{const card=document.querySelector('.training-panel').getBoundingClientRect();return[...document.querySelectorAll('.step-pagination button,.step-pagination>span')].filter(n=>n.getClientRects().length).map(n=>{const r=n.getBoundingClientRect();return{text:n.textContent,inside:r.x>=card.x&&r.right<=card.right&&r.y>=card.y&&r.bottom<=card.bottom}})})()");
      assert.ok(pager.every(n=>n.inside),`${width}x${height}: page count and both arrows stay within training card`);
      await screenshot(`hc031-${width}x${height}-training.png`);
      // The relocated menu must still open by a real pointer hit inside the card.
      await click('#open-menu');
      await waitFor("document.querySelector('#workspace-menu').open");
      await click('#close-menu');
      await settled();

      await nav('library');
      const browseMode = actualMode === '3v3' ? '4v4' : '3v3';
      await setCatalog(browseMode, 'defense');
      await checkMode('library-header-controls', browseMode);
      await checkLayout(width, height, expectedTop, 'library', 'defense-collapsed');
      assert.equal(await evaluate("document.querySelectorAll('.library-card-heading').length"), 4, 'all four defense titles are reachable');
      await checkUnchanged('mode/category filtering only browses, including raw storage', baseline);
      const defense = templates.find(template => template.mode === browseMode && template.kind === 'defense');
      await click(`.library-card-heading[data-template-id="${defense.id}"]`);
      await deckSettled();
      await checkLayout(width, height, expectedTop, 'library', 'defense-expanded');

      await setCatalog(browseMode, 'offense');
      assert.equal(await evaluate("document.querySelectorAll('.library-card-heading').length"), 9, 'all nine offense titles share one DOM page');
      assert.equal(await evaluate("document.querySelector('#template-list').dataset.total"), '9', 'catalog count includes all nine offense tactics');
      assert.equal(await evaluate("document.querySelector('#template-list').dataset.paged"), 'false');
      assert.equal(await evaluate("document.querySelectorAll('[data-library-page]').length"), 0);
      await checkLayout(width, height, expectedTop, 'library', 'offense-collapsed');
      const offense = templates.find(template => template.mode === browseMode && template.kind === 'offense');
      await click(`.library-card-heading[data-template-id="${offense.id}"]`);
      await deckSettled();
      await checkLayout(width, height, expectedTop, 'library', 'offense-expanded');
      await screenshot(`hc031-${width}x${height}-library.png`);
      await click(await evaluate("document.querySelector('#template-list').dataset.layout==='overlay'") ? '.library-card-return:not([hidden])' : `.library-card-heading[data-template-id="${offense.id}"]`);
      await deckSettled();
      await checkLayout(width, height, expectedTop, 'library', 'offense-all-nine-collapsed');
      const last = templates.filter(template => template.mode === browseMode && template.kind === 'offense').at(-1);
      await click(`.library-card-heading[data-template-id="${last.id}"]`);await deckSettled();
      await checkLayout(width, height, expectedTop, 'library', 'offense-last-expanded');
      await screenshot(`hc031-${width}x${height}-last-card.png`);
      await click(await evaluate("document.querySelector('#template-list').dataset.layout==='overlay'") ? '.library-card-return:not([hidden])' : `.library-card-heading[data-template-id="${last.id}"]`);
      await deckSettled();
      await checkUnchanged('opening cards never loads them or writes player/source data', baseline);

      await nav('play');
      await checkMode('play-header-controls', actualMode);
      await checkUnchanged('training restores the real mode without replacing the play', baseline);
    }
    await nav('library');
    await setCatalog(originalCatalog.mode, originalCatalog.kind);
    await nav('lineups');
    await checkUnchanged('layout flow finishes without saved data changes', baseline);
    // A hidden legacy header must not swallow real persistence failures.
    await evaluate("window.hc023SetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='halfcourt-builtin-selection-v1')throw Error('HC023 injected progress write failure');return window.hc023SetItem.call(this,k,v)}");
    try {
      await nav('play');
      await waitFor("!document.querySelector('#storage-status').hidden&&document.querySelector('#storage-status').textContent.includes('记录失败')");
      const storageFailure=await evaluate("(()=>{const n=document.querySelector('#storage-status'),r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.textContent,hiddenAncestor:!!n.closest('[hidden],[aria-hidden=true]'),display:getComputedStyle(n).display,rect:r.toJSON(),overlap:hit?.id}})()");
      assert.equal(storageFailure.hiddenAncestor,false);assert.notEqual(storageFailure.display,'none');assert.ok(storageFailure.rect.height>=14&&storageFailure.rect.y>=0&&storageFailure.rect.bottom<96,'actual error is readable in reserved top space');
      await screenshot('hc031-storage-write-error.png');metrics.push({kind:'storage-write-error',...storageFailure});
    } finally {
      await evaluate('Storage.prototype.setItem=window.hc023SetItem;delete window.hc023SetItem');
      await nav('lineups');await waitFor("document.querySelector('#storage-status').hidden");
    }
    await checkUnchanged('recovery clears error without changing saved data',baseline);
    await writeFile(path.join(folder, 'hc031-page-layout-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
  } finally {
    await send('Runtime.releaseObjectGroup', { objectGroup: 'hc023-layout' });
  }

  async function checkMode(parent, value) {
    const identity = await send('Runtime.callFunctionOn', {
      objectId: modeHandle,
      functionDeclaration: "function(){return this===document.querySelector('#mode')&&this.isConnected}",
      returnByValue: true,
    });
    assert.equal(identity.result.value, true, 'the same mode node moves between pages');
    assert.deepEqual(await evaluate("({count:document.querySelectorAll('#mode').length,parent:document.querySelector('#mode').parentElement.id,value:document.querySelector('#mode').value})"), { count: 1, parent, value });
  }

  async function checkLayout(width, height, expectedTop, view, stage) {
    const value = await evaluate(`(()=>{
      const visible=n=>Boolean(n&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[hidden]'));
      const rect=n=>n?.getBoundingClientRect().toJSON();
      const selector=${JSON.stringify(view === 'lineups' ? '#lineups-panel .lineup-profile-card,#lineups-panel .lineup-main-empty' : view === 'play' ? '.training-panel' : '.library-deck-panel')};
      const card=[...document.querySelectorAll(selector)].find(visible);
      const controls=[...document.querySelectorAll('.view-nav button,'+${JSON.stringify(view === 'lineups' ? '[data-action="lineup-open-archives"],[data-action="lineup-configure"],[data-action="lineup-recommend"],[data-action="lineup-switch-archive"]' : view === 'play' ? '#mode,#template-picker,#open-menu,.toggle-label,#open-note,#play-toggle,#speed,#timeline-scrub,#restart-play' : '#mode,[data-kind-target],.library-card-heading,.library-card-court,.library-card-play,.library-card-return:not([hidden])')})].filter(visible);
      const brand=document.querySelector('#lineup-brand-header');
      return{
        sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,
        card:rect(card),title:card&&[...card.querySelectorAll('h1,h2')].find(visible)?.textContent,
        nav:[...document.querySelectorAll('.view-nav button')].map(n=>({view:n.dataset.viewTarget,label:n.textContent.trim(),pressed:n.getAttribute('aria-pressed')})),
        brandVisible:visible(brand),brand:rect(brand),blankVisible:visible(document.querySelector('.page-top-space')),
        legacyBrandVisible:[...document.querySelectorAll('.app-header .brand')].some(visible),
        controls:controls.map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{id:n.id||n.dataset.viewTarget||n.dataset.templateId||n.dataset.playTemplate||n.dataset.action||n.dataset.kindTarget||n.className,playCTA:Boolean(n.dataset.playTemplate),rect:r.toJSON(),disabled:Boolean(n.disabled||n.querySelector('input')?.disabled),hit:hit===n||n.contains(hit)}}),
        expanded:document.querySelectorAll('.library-card-body:not([hidden])').length,
        deckLayout:document.querySelector('#template-list').dataset.layout,
        titleCount:document.querySelectorAll('.library-card-heading').length,
        visibleTitles:[...document.querySelectorAll('.library-card-heading')].filter(visible).length,
        body:card&&[...card.querySelectorAll('.library-card-body:not([hidden])')].map(n=>({rect:rect(n),court:rect(n.querySelector('.library-card-court')),cta:rect(n.querySelector('.library-card-play'))})),
        aboveCard:card&&[...document.querySelectorAll('button,input,select,h1,h2,img')].filter(n=>visible(n)&&n.getBoundingClientRect().bottom<card.getBoundingClientRect().top-1).map(n=>n.id||n.className||n.tagName)
      };
    })()`);
    const label = `${width}x${height} ${view}/${stage}`;
    assert.ok(value.card, `${label}: main card exists`);
    assert.ok(value.sw <= width + 2 && value.sh <= height + 2, `${label}: page overflows ${JSON.stringify(value)}`);
    assert.ok(Math.abs(value.card.y - expectedTop) <= 3, `${label}: card top ${value.card.y}, expected ${expectedTop}`);
    assert.ok(value.card.x >= -1 && value.card.right <= width + 1 && value.card.bottom <= height + 1, `${label}: card stays inside screen`);
    if (width >= 1280) assert.ok(value.card.width <= 1280, `${label}: desktop card has a bounded reading width`);
    assert.ok(value.title?.includes(view === 'lineups' ? '更衣室' : view === 'play' ? '训练场' : '战术库'), `${label}: visible page title ${value.title}`);
    assert.deepEqual(value.nav.map(n => n.label), ['更衣室', '训练场', '战术库', '档案']);
    assert.equal(value.nav.find(n => n.view === view)?.pressed, 'true');
    assert.equal(value.brandVisible, view === 'lineups', `${label}: brand belongs only to locker room`);
    assert.equal(value.legacyBrandVisible, false, `${label}: no duplicate legacy brand`);
    assert.equal(value.blankVisible, view !== 'lineups', `${label}: blank header zone is preserved`);
    if (view === 'lineups') assert.ok(value.brand.y >= 0 && value.brand.bottom <= value.card.y + 1, `${label}: brand stays above card`);
    else assert.deepEqual(value.aboveCard, [], `${label}: header space contains no controls or brand`);
    for (const control of value.controls) {
      const r = control.rect;
      assert.ok(r.width > 0 && r.height > 0 && r.x >= -1 && r.y >= -1 && r.right <= width + 1 && r.bottom <= height + 1, `${label}: control outside viewport ${JSON.stringify(control)}`);
      assert.ok(control.hit, `${label}: control occluded ${JSON.stringify(control)}`);
      assert.equal(control.disabled, false, `${label}: primary control enabled ${control.id}`);
    }
    if (view === 'play') assert.ok(value.controls.some(n => n.id === 'play-toggle') && value.controls.some(n => n.id === 'template-picker'), `${label}: primary playback controls exist`);
    if (view === 'lineups') assert.ok(value.controls.some(n => ['lineup-open-archives', 'lineup-configure'].includes(n.id)), `${label}: archive/create path or configure CTA exists`);
    if(view==='library'){
      assert.equal(value.titleCount,stage.startsWith('defense')?4:9,`${label}: entire catalog is present`);
      assert.equal(value.visibleTitles,value.deckLayout==='overlay'?1:value.titleCount,`${label}: only short overlay conceals other titles`);
    }
    if (view === 'library' && stage.endsWith('expanded')) {
      assert.equal(value.expanded, 1, `${label}: exactly one complete card opens`);
      assert.ok(value.controls.some(n => n.playCTA), `${label}: expanded play CTA exists`);
      assert.ok(value.body.every(n => n.court.width > 50 && n.court.height > 40 && n.cta.height >= 30 && n.cta.bottom <= value.card.bottom + 1), `${label}: court and CTA have usable room`);
    }
    metrics.push({ width, height, view, stage, ...value });
  }
}
