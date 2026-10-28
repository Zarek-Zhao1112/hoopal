export const SOFT_GLOW_DURATION = 600;
export const SOFT_GLOW_FEATHER = 43;

function clampUnit(value) {
  let number;
  try { number = Number(value); } catch { return 0; }
  return Math.max(0, Math.min(1, number || 0));
}

const smoothstep = u => u * u * (3 - 2 * u);
const hermite = (a, b, m0, m1, u) =>
  (2 * u ** 3 - 3 * u ** 2 + 1) * a + (u ** 3 - 2 * u ** 2 + u) * m0
  + (-2 * u ** 3 + 3 * u ** 2) * b + (u ** 3 - u ** 2) * m1;

/** Approved HC-013 C preview timing; progress is normalized across the full 600ms. */
export function sampleSoftGlow(progress) {
  const elapsedMs = clampUnit(progress) * SOFT_GLOW_DURATION;
  let radiusProgress, glowOpacity, stage;
  if (elapsedMs < 100) {
    const u = elapsedMs / 100;
    radiusProgress = .09 * u * u;
    glowOpacity = smoothstep(u);
    stage = 'rise';
  } else if (elapsedMs < 450) {
    const u = (elapsedMs - 100) / 350;
    // Tangents are scaled to this segment's duration: .63/350 = .18/100.
    radiusProgress = hermite(.09, .90, .63, .35, u);
    glowOpacity = 1;
    stage = 'expand';
  } else {
    const u = (elapsedMs - 450) / 150;
    // .15/150 = .35/350 at the join; the final tangent is zero.
    radiusProgress = hermite(.90, 1, .15, 0, u);
    glowOpacity = 1 - smoothstep(u);
    stage = 'settle';
  }
  return { elapsedMs, radiusProgress: clampUnit(radiusProgress), glowOpacity: clampUnit(glowOpacity), stage };
}
