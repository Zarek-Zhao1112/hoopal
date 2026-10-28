import test from 'node:test';
import assert from 'node:assert/strict';
import { paginate, pageForIndex, splitNote } from '../../frontend/src/workspace/state.js';

test('all forty saved tactics remain reachable through four-item pages', () => {
  const library = Array.from({length:40}, (_, index) => ({id:`saved-${index}`}));
  const visited = [];
  for (let page = 0; page < 10; page++) {
    const result = paginate(library, page, 4);
    assert.equal(result.page, page);
    assert.equal(result.pages, 10);
    assert.equal(result.total, 40);
    assert.equal(result.items.length, 4);
    visited.push(...result.items.map(item => item.id));
  }
  assert.deepEqual(visited, library.map(item => item.id));
});

test('deleting the final item clamps the current page and an empty library remains usable', () => {
  const library = ['a','b','c','d','e'];
  assert.deepEqual(paginate(library, 1, 4).items, ['e']);
  library.pop();
  const clamped = paginate(library, 1, 4);
  assert.equal(clamped.page, 0);
  assert.deepEqual(clamped.items, library);
  const empty = paginate([], 9, 4);
  assert.equal(empty.page, 0);
  assert.equal(empty.pages, 1);
  assert.deepEqual(empty.items, []);
});

test('all sixty steps can be selected and page lookup follows the actual active step', () => {
  const steps = Array.from({length:60}, (_, index) => index);
  for (const index of steps) {
    const page = pageForIndex(index, 6);
    assert.ok(paginate(steps, page, 6).items.includes(index));
  }
  assert.equal(pageForIndex(59, 6), 9);
  assert.deepEqual(paginate(steps, 9, 6).items, [54,55,56,57,58,59]);
});

test('long explanations preserve every character and newline across readable Unicode pages', () => {
  const note = ('第六十步：接球后观察协防 🏀\n外弹后再回传。').repeat(60);
  const pages = splitNote(note, 80);
  assert.ok(pages.length > 10);
  assert.equal(pages.join(''), note);
  for (const page of pages) {
    assert.ok(Array.from(page).length <= 80);
    assert.ok(page.isWellFormed(), 'no split surrogate pairs');
  }
  assert.deepEqual(splitNote(''), ['']);
});
