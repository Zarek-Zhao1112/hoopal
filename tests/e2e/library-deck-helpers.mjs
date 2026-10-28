import assert from 'node:assert/strict';

/** All catalog entries share one page; finding one never loads a Play. */
export async function findLibraryCard({ evaluate, waitFor }, id) {
  const selector = `.library-card-heading[data-template-id=${JSON.stringify(id)}]`;
  assert.equal(await evaluate("document.querySelectorAll('[data-library-page]').length"), 0, 'catalog has no pagination controls');
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`), 1, `catalog contains ${id} exactly once on the current page`);
  await waitFor("document.querySelector('#template-list').dataset.transitioning!=='true'");
  const covered = await evaluate(`(()=>{const d=document.querySelector('#template-list').dataset;return d.layout==='overlay'&&d.expandedId&&d.expandedId!==${JSON.stringify(id)}})()`);
  if (covered) {
    assert.ok(await evaluate("(()=>{const n=document.querySelector('.library-card-return:not([hidden])');if(!n||n.closest('button').disabled)return false;const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(!(hit===n||n.contains(hit)))return false;n.click();return true})()"), 'close the visible overlay before locating another title');
    await waitFor("document.querySelector('#template-list').dataset.expandedId===''&&document.querySelector('#template-list').dataset.transitioning!=='true'");
  }
  return selector;
}
