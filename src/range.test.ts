import { describe, expect, it } from 'vitest';
import type { RigPattern } from './types';
import { poseAt } from './pose';
import { RIG, buildSkeleton, type Skeleton } from './solve';
import { RANGE_PRESETS, applyRigParams, resolveRange } from './params';
import { PATTERNS } from './patterns';

/**
 * Continuous range of motion is the one thing a pre-rendered animation cannot
 * express, so it carries the same burden of proof as the form invariants: a
 * shallower squat still has to be a plausible human, not a shorter one.
 */

const SAMPLES = 24;
const patterns = Object.values(PATTERNS);
/** Patterns with a single keyframe hold one position; scaling is a no-op there. */
const repPatterns = patterns.filter((p) => p.keyframes.length > 1);

function samples(pattern: RigPattern, range?: number | string): Skeleton[] {
  const r = applyRigParams(pattern, range === undefined ? {} : { range });
  const out: Skeleton[] = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const pose = poseAt(r, (r.cycleMs * i) / SAMPLES);
    out.push(buildSkeleton(pose, r.footDir, r.view, r.toe));
  }
  return out;
}

/** How far the figure travels from its start pose, summed over the cycle. */
function travel(pattern: RigPattern, range?: number | string): number {
  const s = samples(pattern, range);
  const base = s[0];
  let total = 0;
  for (const f of s) {
    total += Math.hypot(f.hipX - base.hipX, f.hipY - base.hipY);
    total += Math.hypot(f.armR.endX - base.armR.endX, f.armR.endY - base.armR.endY);
    total += Math.hypot(f.legR.endX - base.legR.endX, f.legR.endY - base.legR.endY);
  }
  return total;
}

describe('resolveRange', () => {
  it('maps the named presets to the constants the patterns were authored against', () => {
    expect(resolveRange('pulse')).toBe(RANGE_PRESETS.pulse);
    expect(resolveRange('full')).toBe(RANGE_PRESETS.full);
  });

  it('passes finite non-negative numbers through unchanged', () => {
    for (const n of [0, 0.25, 0.6, 1, 1.2]) expect(resolveRange(n)).toBe(n);
  });

  it('returns null for anything that is not a range, so the caller can skip the pass', () => {
    for (const v of [undefined, null, '', 'wide', {}, [], NaN, Infinity, -0.5, -1]) {
      expect(resolveRange(v)).toBeNull();
    }
  });
});

describe('the string presets are unchanged by the widening', () => {
  // The whole existing pattern library was eyeballed at these two values. If a
  // number and its preset ever diverge, every authored pattern silently shifts.
  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s: range "pulse" is identical to range 0.45',
    (_id, pattern) => {
      expect(samples(pattern, 'pulse')).toEqual(samples(pattern, RANGE_PRESETS.pulse));
    },
  );

  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s: range "full" is identical to range 1.15',
    (_id, pattern) => {
      expect(samples(pattern, 'full')).toEqual(samples(pattern, RANGE_PRESETS.full));
    },
  );

  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s: no range at all is identical to range 1',
    (_id, pattern) => {
      expect(samples(pattern, undefined)).toEqual(samples(pattern, 1));
    },
  );
});

/**
 * Some multi-keyframe patterns are static by design — a forearm plank has
 * several keyframes describing a breathing hold that the measured joints barely
 * move through. Scaling those is legitimately a no-op, so the "must travel"
 * assertion only applies to patterns that travel in the first place.
 */
const movingPatterns = repPatterns.filter((p) => travel(p, 1) > 1);

describe('range scales the movement monotonically', () => {
  it.each(movingPatterns.map((p) => [p.id, p] as const))(
    '%s travels further as the range widens',
    (_id, pattern) => {
      const measured = [0, 0.25, 0.5, 0.75, 1].map((k) => travel(pattern, k));
      for (let i = 1; i < measured.length; i += 1) {
        expect(measured[i]).toBeGreaterThanOrEqual(measured[i - 1] - 1e-6);
      }
      // A full-range rep has to actually move, or the monotonicity above is
      // satisfied by a pattern that never leaves its start pose.
      expect(measured[measured.length - 1]).toBeGreaterThan(measured[0]);
    },
  );

  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s at range 0 never leaves the start pose',
    (_id, pattern) => {
      expect(travel(pattern, 0)).toBeCloseTo(0, 6);
    },
  );
});

describe('form invariants hold across the whole range sweep', () => {
  // This is the test that matters. Scaling every joint toward the start pose is
  // a geometric shortcut, and the risk it carries is that an intermediate value
  // lands somewhere no authored keyframe ever went — a knee bending backwards,
  // or a bone stretching to reach.
  const SWEEP = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1, 1.15, 1.2];

  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s keeps every bone rigid at every range',
    (_id, pattern) => {
      for (const k of SWEEP) {
        for (const s of samples(pattern, k)) {
          for (const [limb, l1, l2] of [
            [s.armR, RIG.upperArm, RIG.foreArm],
            [s.armL, RIG.upperArm, RIG.foreArm],
            [s.legR, RIG.thigh, RIG.shin],
            [s.legL, RIG.thigh, RIG.shin],
          ] as const) {
            expect(
              Math.hypot(limb.jointX - limb.rootX, limb.jointY - limb.rootY),
            ).toBeCloseTo(l1, 3);
            expect(Math.hypot(limb.endX - limb.jointX, limb.endY - limb.jointY)).toBeCloseTo(
              l2,
              3,
            );
          }
        }
      }
    },
  );

  it.each(repPatterns.map((p) => [p.id, p] as const))(
    '%s produces finite geometry at every range',
    (_id, pattern) => {
      for (const k of SWEEP) {
        for (const s of samples(pattern, k)) {
          for (const v of [
            s.hipX,
            s.hipY,
            s.shoulderX,
            s.shoulderY,
            s.headX,
            s.headY,
            s.armR.endX,
            s.armR.endY,
            s.legR.endX,
            s.legR.endY,
          ]) {
            expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    },
  );
});
