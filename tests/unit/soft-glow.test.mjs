import test from 'node:test';
import assert from 'node:assert/strict';
import { SOFT_GLOW_DURATION, SOFT_GLOW_FEATHER, sampleSoftGlow } from '../../frontend/src/workspace/soft-glow.js';

const atMs = time => sampleSoftGlow(time / SOFT_GLOW_DURATION);
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected} by more than ${tolerance}`);

test('approved timing, feather and phase landmarks retain the preview pacing', () => {
  assert.equal(SOFT_GLOW_DURATION, 600); assert.equal(SOFT_GLOW_FEATHER, 43);
  for (const [time, radius, glow, stage] of [
    [0, 0, 0, 'rise'], [50, .0225, .5, 'rise'], [100, .09, 1, 'expand'],
    [450, .9, 1, 'settle'], [525, .96875, .5, 'settle'], [600, 1, 0, 'settle'],
  ]) {
    const sample = atMs(time);
    near(sample.elapsedMs, time); near(sample.radiusProgress, radius); near(sample.glowOpacity, glow);
    assert.equal(sample.stage, stage);
  }
  assert.equal(atMs(99.999).stage, 'rise');
  assert.equal(atMs(449.999).stage, 'expand');
});

test('invalid and out-of-range inputs never produce non-finite state or throw during animation', () => {
  const zero = sampleSoftGlow(0), end = sampleSoftGlow(1);
  for (const value of [undefined, null, NaN, -Infinity, -100, '', 'not a number', Symbol('invalid'), {}, { valueOf() { throw new Error('cannot convert'); } }]) assert.deepEqual(sampleSoftGlow(value), zero);
  for (const value of [Infinity, 2, 600, '2']) assert.deepEqual(sampleSoftGlow(value), end);
  assert.deepEqual(sampleSoftGlow('0.5'), sampleSoftGlow(.5));
});

test('dense samples reveal strictly forward without overshoot; glow rises, holds, then fades', () => {
  let previous = sampleSoftGlow(0);
  for (let i = 1; i <= 10000; i++) {
    const sample = sampleSoftGlow(i / 10000);
    assert.ok(Number.isFinite(sample.elapsedMs) && Number.isFinite(sample.radiusProgress) && Number.isFinite(sample.glowOpacity));
    assert.ok(sample.radiusProgress > previous.radiusProgress && sample.radiusProgress <= 1);
    assert.ok(sample.glowOpacity >= 0 && sample.glowOpacity <= 1);
    if (sample.elapsedMs <= 100) assert.ok(sample.glowOpacity >= previous.glowOpacity);
    else if (sample.elapsedMs < 450) assert.equal(sample.glowOpacity, 1);
    else assert.ok(sample.glowOpacity <= previous.glowOpacity);
    previous = sample;
  }
  assert.equal(previous.radiusProgress, 1); assert.equal(previous.glowOpacity, 0);
});

test('physical velocity is continuous at both joins and settles to zero without an endpoint snap', () => {
  const step = .001;
  for (const [time, expectedVelocity] of [[100, .0018], [450, .001]]) {
    const before = atMs(time - step), sample = atMs(time), after = atMs(time + step);
    const left = (sample.radiusProgress - before.radiusProgress) / step;
    const right = (after.radiusProgress - sample.radiusProgress) / step;
    near(left, right, 1e-7); near(left, expectedVelocity, 1e-7);
    near(before.radiusProgress, sample.radiusProgress, .000002);
    near(after.radiusProgress, sample.radiusProgress, .000002);
    // A glow phase change also has no jump or sudden fade slope.
    near((sample.glowOpacity - before.glowOpacity) / step, 0, 4e-7);
    near((after.glowOpacity - sample.glowOpacity) / step, 0, 4e-7);
  }
  near((atMs(step).radiusProgress - atMs(0).radiusProgress) / step, 0, 2e-8);
  near((atMs(600).radiusProgress - atMs(600 - step).radiusProgress) / step, 0, 2e-8);
});

test('sampler matches recorded observations of the approved HTML preview without duplicating its polynomial', () => {
  // Captured from artifacts/design/soft-glow-preview/index.template.html's
  // actual inspect() on 2026-10-23. Artifacts are not a runtime/test dependency.
  const observations = [
    [15, .002025, .06075], [50, .0225, .5], [100, .09, 1],
    [125, .13895043731778425, 1], [200, .3220116618075801, 1],
    [275, .53, 1], [300, .5983381924198251, 1], [375, .7807871720116617, 1],
    [450, .9, 1], [475, .9247685185185186, .9259259259259259],
    [500, .9481481481481482, .7407407407407407], [525, .96875, .5],
    [550, .9851851851851852, .2592592592592593], [590, .9993481481481481, .01274074074074072], [600, 1, 0],
  ];
  for (const [time, radius, glow] of observations) {
    const actual = atMs(time);
    near(actual.elapsedMs, time); near(actual.radiusProgress, radius); near(actual.glowOpacity, glow);
  }
});

test('each call is independent and does not carry phase state between forward and backward seeks', () => {
  const first = sampleSoftGlow(.8), original = { ...first };
  first.glowOpacity = -1; first.stage = 'changed';
  sampleSoftGlow(.1); sampleSoftGlow(1);
  assert.deepEqual(sampleSoftGlow(.8), original);
});
