import { describe, expect, it } from 'vitest';
import { applyRigParams } from './params';
import { PATTERNS } from './patterns';
import { poseAt } from './pose';
import { DEFAULT_PROPORTIONS, buildSkeleton, halfWidth } from './solve';
import { figureGeometry } from './draw';

/**
 * The whole point of threading an optional `Proportions` argument through the
 * rig is that leaving it out must be indistinguishable from passing
 * `DEFAULT_PROPORTIONS` explicitly — that's the "no visual change" guarantee
 * the dev gallery relies on.
 */

const SAMPLE_IDS = ['pushup_horizontal', 'squat', 'jumping_jack'] as const;

describe('DEFAULT_PROPORTIONS matches the implicit default', () => {
  it('halfWidth is identical for both views', () => {
    expect(halfWidth('side', DEFAULT_PROPORTIONS)).toBe(halfWidth('side'));
    expect(halfWidth('front', DEFAULT_PROPORTIONS)).toBe(halfWidth('front'));
  });

  it.each(SAMPLE_IDS)('%s produces an identical skeleton at every keyframe', (id) => {
    const pattern = PATTERNS[id];
    expect(pattern).toBeDefined();
    const r = applyRigParams(pattern, {});

    for (const pose of r.keyframes) {
      const withoutOverride = buildSkeleton(pose, r.footDir, r.view, r.toe);
      const withDefault = buildSkeleton(pose, r.footDir, r.view, r.toe, DEFAULT_PROPORTIONS);
      expect(withDefault).toEqual(withoutOverride);
    }
  });

  it.each(SAMPLE_IDS)('%s produces identical figure geometry across a full cycle', (id) => {
    const pattern = PATTERNS[id];
    const r = applyRigParams(pattern, {});
    const SAMPLES = 16;

    for (let i = 0; i <= SAMPLES; i += 1) {
      const pose = poseAt(r, (r.cycleMs * i) / SAMPLES);
      const withoutOverride = figureGeometry(pose, r);
      const withDefault = figureGeometry(pose, r, DEFAULT_PROPORTIONS);
      expect(withDefault).toEqual(withoutOverride);
    }
  });
});
