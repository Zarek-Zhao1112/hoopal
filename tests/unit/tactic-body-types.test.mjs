import test from 'node:test';
import assert from 'node:assert/strict';
import { templates } from '../../shared/templates.js';
import { BODY_TYPES, getBodyTypes, isBodyTypeForMode, validateTacticBodyTypes, filterTacticsByBodyType, getTacticBodyNote } from '../../shared/tactic-body-types.js';
import { validateTacticCatalog } from '../../shared/tactic-roles.js';

test('body type cards describe exactly three or four relative body sizes without individual abilities', () => {
  assert.deepEqual(getBodyTypes('3v3').map(type => [type.id, type.label]), [['one-big', '一大两小'], ['two-big', '两大一小'], ['similar', '体型接近']]);
  assert.deepEqual(getBodyTypes('4v4').map(type => [type.id, type.label]), [['one-big', '一大三小'], ['two-big', '两大两小'], ['three-big', '三大一小'], ['similar', '体型接近']]);
  for (const [mode, count] of [['3v3', 3], ['4v4', 4]]) for (const type of getBodyTypes(mode)) {
    assert.equal(type.largeCount + type.smallCount + type.equalCount, count);
    assert.match(type.description, /体型/);
    assert.ok(!/内线|外线|投射|灵活|强壮|擅长/.test(type.description));
    assert.equal(isBodyTypeForMode(mode, type.id), true);
  }
  assert.equal(isBodyTypeForMode('3v3', 'three-big'), false);
  assert.equal(isBodyTypeForMode('4v4', 'three-big'), true);
});

test('type options are immutable constants and callers receive independent editable copies', () => {
  assert.ok(Object.isFrozen(BODY_TYPES));
  assert.ok(Object.isFrozen(BODY_TYPES['3v3']));
  assert.ok(Object.isFrozen(BODY_TYPES['3v3'][0]));
  const copy = getBodyTypes('3v3'); copy[0].label = 'changed'; copy.pop();
  assert.equal(getBodyTypes('3v3')[0].label, '一大两小');
  assert.equal(getBodyTypes('3v3').length, 3);
});

test('invalid modes and category IDs never fall through to a different roster size', () => {
  for (const mode of [null, undefined, '', '5v5', '__proto__', ['3v3'], {}]) {
    assert.equal(isBodyTypeForMode(mode, 'one-big'), false);
    assert.throws(() => getBodyTypes(mode), /人数/);
    assert.throws(() => filterTacticsByBodyType(templates, { mode, kind: 'offense', bodyType: null }), /人数/);
  }
  for (const id of [null, undefined, '', ' one-big', '__proto__', {}, ['one-big']]) assert.equal(isBodyTypeForMode('3v3', id), false);
  for (const patch of [{ mode: '3v3', bodyType: 'three-big' }, { mode: '4v4', bodyType: '' }, { mode: '3v3', kind: 'all' }]) {
    assert.throws(() => filterTacticsByBodyType(templates, { kind: 'offense', ...patch }));
  }
});

test('all twenty-six registered tactics explicitly author complete memberships and concise notes', () => {
  assert.equal(templates.length, 26);
  for (const template of templates) {
    const copy = validateTacticBodyTypes(template);
    assert.ok(copy.bodyTypes.length > 0);
    assert.equal(new Set(copy.bodyTypes).size, copy.bodyTypes.length);
    assert.deepEqual(Object.keys(copy.bodyTypeNotes).sort(), [...copy.bodyTypes].sort());
    for (const id of copy.bodyTypes) {
      assert.ok(isBodyTypeForMode(template.mode, id));
      assert.ok(getTacticBodyNote(template, id).length <= 120);
      assert.ok(!/适合度|胜率|最佳|最适合|%/.test(getTacticBodyNote(template, id)));
    }
    copy.bodyTypes.pop(); copy.bodyTypeNotes[template.bodyTypes[0]] = 'changed';
    assert.notDeepEqual(copy, validateTacticBodyTypes(template), 'validation does not expose mutable source metadata');
  }
});

test('every supported size, side and body category has candidates and all original tactics remain reachable', () => {
  const reachable = new Set();
  for (const mode of ['3v3', '4v4']) for (const kind of ['offense', 'defense']) for (const type of getBodyTypes(mode)) {
    const candidates = filterTacticsByBodyType(templates, { mode, kind, bodyType: type.id });
    assert.ok(candidates.length > 0, `${mode}/${kind}/${type.id}`);
    assert.ok(candidates.every(t => t.mode === mode && t.kind === kind && t.bodyTypes.includes(type.id)));
    assert.equal(new Set(candidates.map(t => t.id)).size, candidates.length);
    candidates.forEach(t => reachable.add(t.id));
  }
  assert.equal(reachable.size, 26);
});

test('filters retain source order and identity without scores, implicit assignments or cross-size fallback', () => {
  const before = structuredClone(templates.map(({ build, ...data }) => data));
  for (const mode of ['3v3', '4v4']) for (const kind of ['offense', 'defense']) {
    const all = filterTacticsByBodyType(templates, { mode, kind, bodyType: null });
    assert.deepEqual(all.map(t => t.id), templates.filter(t => t.mode === mode && t.kind === kind).map(t => t.id));
    for (const candidate of all) assert.equal(candidate, templates.find(t => t.id === candidate.id));
    for (const type of getBodyTypes(mode)) {
      const candidates = filterTacticsByBodyType(templates, { mode, kind, bodyType: type.id });
      assert.deepEqual(candidates.map(t => t.id), all.filter(t => t.bodyTypes.includes(type.id)).map(t => t.id));
    }
  }
  assert.deepEqual(templates.map(({ build, ...data }) => data), before);
  const three = templates.filter(t => t.mode === '3v3');
  assert.deepEqual(filterTacticsByBodyType(three, { mode: '4v4', kind: 'offense', bodyType: 'three-big' }), [], 'an empty selection is never replaced by three-player tactics');
});

test('body classification is selective while shared play mechanics may appear in several categories', () => {
  assert.deepEqual(templates.find(t => t.id === 'pick-roll').bodyTypes, ['one-big', 'similar']);
  assert.deepEqual(templates.find(t => t.id === 'high-low').bodyTypes, ['two-big', 'three-big']);
  assert.ok(filterTacticsByBodyType(templates, { mode: '3v3', kind: 'offense', bodyType: 'one-big' }).some(t => t.id === 'give-go'));
  assert.ok(filterTacticsByBodyType(templates, { mode: '3v3', kind: 'offense', bodyType: 'two-big' }).some(t => t.id === 'give-go'));
  assert.throws(() => getTacticBodyNote(templates.find(t => t.id === 'pick-roll'), 'two-big'), /未归入/);
});

test('missing, duplicate, cross-mode and malformed category metadata rejects future registered plays', () => {
  const template = templates.find(t => t.id === 'pick-roll');
  const bad = [
    { bodyTypes: undefined }, { bodyTypes: [] }, { bodyTypes: ['one-big', 'one-big'] },
    { bodyTypes: ['three-big'] }, { bodyTypes: ['__proto__'] },
    { bodyTypeNotes: undefined }, { bodyTypeNotes: [] }, { bodyTypeNotes: {} },
    { bodyTypeNotes: { 'one-big': '', similar: 'a' } },
    { bodyTypeNotes: { 'one-big': '  ', similar: 'a' } },
    { bodyTypeNotes: { 'one-big': 'a'.repeat(121), similar: 'a' } },
    { bodyTypeNotes: { 'one-big': 'a', similar: 'a', other: 'extra' } },
  ];
  for (const patch of bad) {
    const candidate = { ...template, ...patch, id: 'future-body-metadata' };
    assert.throws(() => validateTacticBodyTypes(candidate), /体型分类/);
    assert.throws(() => validateTacticCatalog([...templates, candidate]), /体型分类/);
    assert.throws(() => filterTacticsByBodyType([...templates, candidate], { mode: '4v4', kind: 'defense', bodyType: 'similar' }), /体型分类/, 'a missing definition cannot hide behind another size filter');
  }
});

test('classification validation normalizes note whitespace without modifying authors or templates', () => {
  const t = templates.find(t => t.id === 'pick-roll');
  const authored = { ...t, bodyTypeNotes: { 'one-big': '  示例说明  ', similar: '  另一说明  ' } };
  assert.equal(getTacticBodyNote(authored, 'one-big'), '示例说明');
  assert.equal(authored.bodyTypeNotes['one-big'], '  示例说明  ');
  assert.equal(getTacticBodyNote(t, 'one-big'), t.bodyTypeNotes['one-big']);
});
