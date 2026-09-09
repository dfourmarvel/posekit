import { describe, expect, it } from 'vitest';
import type { RigPattern } from './types';
import { lerpPose, poseAt } from './pose';
import { RIG, solveLimb } from './solve';
import { applyRigParams } from './params';
import { PATTERNS } from './patterns';

const patterns = Object.values(PATTERNS);

describe('solveLimb', () => {
  it('clamps an unreachable target to the limb length', () => {
    const l1 = RIG.upperArm;
    const l2 = RIG.foreArm;
    const s = solveLimb(100, 100, 400, 100, l1, l2, 1);
    const reach = Math.hypot(s.endX - 100, s.endY - 100);
    expect(reach).toBeCloseTo(l1 + l2 - 0.02, 6);
  });

  it('reaches a reachable target exactly', () => {
    const s = solveLimb(100, 100, 120, 130, RIG.upperArm, RIG.foreArm, 1);
    expect(s.endX).toBeCloseTo(120, 6);
    expect(s.endY).toBeCloseTo(130, 6);
  });

  it('mirrors the joint about the root-to-target line when bend flips', () => {
    const root = { x: 100, y: 100 };
    const target = { x: 130, y: 140 };
    const args = [root.x, root.y, target.x, target.y, RIG.thigh, RIG.shin] as const;
    const a = solveLimb(...args, 1);
    const b = solveLimb(...args, -1);

    // Signed perpendicular distance from the joint to the root→target line.
    const dx = target.x - root.x;
    const dy = target.y - root.y;
    const len = Math.hypot(dx, dy);
    const side = (jx: number, jy: number) => ((jx - root.x) * dy - (jy - root.y) * dx) / len;

    expect(side(a.jointX, a.jointY)).toBeCloseTo(-side(b.jointX, b.jointY), 6);
    expect(Math.abs(side(a.jointX, a.jointY))).toBeGreaterThan(1);
  });

});

describe('lerpPose', () => {
  it('returns the endpoints at t = 0 and t = 1', () => {
    const [a, b] = patterns[0].keyframes;
    expect(lerpPose(a, b, 0)).toEqual(a);
    expect(lerpPose(a, b, 1)).toEqual(b);
  });

  it('steps bend rather than interpolating it, so bones keep their length', () => {
    const base = patterns[0].keyframes[0];
    const mid = lerpPose({ ...base, armBend: [1, 1] }, { ...base, armBend: [-1, -1] }, 0.6);
    expect(mid.armBend[0]).toBe(-1);
  });
});

describe('poseAt', () => {
  it.each(patterns.map((p) => [p.id, p] as const))('%s loops continuously', (_id, pattern) => {
    expect(poseAt(pattern, 0)).toEqual(poseAt(pattern, pattern.cycleMs));
    expect(poseAt(pattern, 0)).toEqual(poseAt(pattern, pattern.cycleMs * 4));
  });

  it.each(patterns.map((p) => [p.id, p] as const))('%s is pure', (_id, pattern) => {
    const t = pattern.cycleMs * 0.37;
    expect(poseAt(pattern, t)).toEqual(poseAt(pattern, t));
  });

  it('handles negative elapsed time without producing NaN', () => {
    const pose = poseAt(patterns[0], -500);
    expect(Number.isFinite(pose.hip[0])).toBe(true);
    expect(Number.isFinite(pose.hip[1])).toBe(true);
  });

  it('returns the single keyframe unchanged for a one-frame pattern', () => {
    const single: RigPattern = { ...patterns[0], keyframes: [patterns[0].keyframes[0]] };
    expect(poseAt(single, 1234)).toEqual(single.keyframes[0]);
  });
});

describe('pattern registry', () => {
  // Bounds containment lives in form.test.ts, which sweeps every pattern AND
  // every named pose against all seventeen documented param variants — a strict
  // superset of the two checks that used to sit here. Deleting the front-view
  // mirror duplicate in e02364f and leaving these was the same mistake twice:
  // an invariant with more than one home is one an exemption can miss.

  it.each(patterns.map((p) => [p.id, p] as const))('%s declares a plausible cycle', (_id, p) => {
    expect(p.cycleMs).toBeGreaterThanOrEqual(400);
    expect(p.cycleMs).toBeLessThanOrEqual(8000);
    expect(p.keyframes.length).toBeGreaterThanOrEqual(1);
  });

  // The front-view mirror rule lives in form.test.ts, not here. It used to be in
  // both, with the same three assertions — and when `symmetry: 'free'` was added
  // so that an asymmetric frontal-plane movement could opt out, only one copy
  // learned about it. A Cossack squat then failed a rule that had already been
  // taught not to apply to it, from a file nobody thought to look in. One
  // invariant, one home.
});

describe('applyRigParams', () => {
  it('is a no-op for empty params', () => {
    const base = PATTERNS.pushup_horizontal;
    const resolved = applyRigParams(base, {});
    expect(resolved.keyframes).toEqual(base.keyframes);
    expect(resolved.cycleMs).toBe(base.cycleMs);
  });

  it('never throws on unknown or malformed params', () => {
    const base = PATTERNS.squat;
    const junk = [
      { nonsense: true },
      { hands: 'not-a-real-value' },
      { hands: 42 },
      { elevate: null },
      { range: 'sideways' },
      { single: 'yes' },
      { tempo: {} },
    ];
    for (const params of junk) {
      expect(() => applyRigParams(base, params as Record<string, unknown>)).not.toThrow();
    }
  });

  it('leaves grip width alone but shifts the hands for a staggered grip', () => {
    const base = PATTERNS.pushup_horizontal;
    // A side view cannot show how far apart the hands are, so width variants
    // share the base animation rather than faking it with an offset.
    expect(applyRigParams(base, { hands: 'wide' }).keyframes).toEqual(base.keyframes);
    expect(applyRigParams(base, { hands: 'diamond' }).keyframes).toEqual(base.keyframes);

    const staggered = applyRigParams(base, { hands: 'staggered' });
    expect(staggered.keyframes[0].handR[0]).toBeGreaterThan(base.keyframes[0].handR[0]);
  });

  it('collapses a hold to the working pose plus a small breathing drift', () => {
    const base = PATTERNS.squat;
    const held = applyRigParams(base, { hold: true });
    expect(held.keyframes).toHaveLength(2);
    // The working position is the end of the movement — a wall sit holds the
    // bottom of a squat, not the standing start.
    expect(held.keyframes[0]).toEqual(base.keyframes[base.keyframes.length - 1]);

    const drift = Math.hypot(
      held.keyframes[1].hip[0] - held.keyframes[0].hip[0],
      held.keyframes[1].hip[1] - held.keyframes[0].hip[1],
    );
    expect(drift).toBeCloseTo(1.5, 6);
    expect(held.keyframes[1].torsoAngle).toBeCloseTo(held.keyframes[0].torsoAngle - 1, 6);
    expect(held.cycleMs).toBe(3400);
  });

  it('shortens the range for a pulse and speeds up an explosive tempo', () => {
    const base = PATTERNS.squat;
    const pulse = applyRigParams(base, { range: 'pulse' });
    const fullTravel = base.keyframes[1].hip[1] - base.keyframes[0].hip[1];
    const pulseTravel = pulse.keyframes[1].hip[1] - pulse.keyframes[0].hip[1];
    expect(pulseTravel).toBeCloseTo(fullTravel * 0.45, 6);

    const fast = applyRigParams(base, { tempo: 'explosive' });
    expect(fast.cycleMs).toBe(Math.round(base.cycleMs * 0.55));
    expect(fast.ease).toBe('explosive');
  });

  it('adds a support block and raises the named contacts when elevated', () => {
    const base = PATTERNS.pushup_horizontal;
    const inclined = applyRigParams(base, { elevate: 'hands' });
    expect(inclined.keyframes[0].handR[1]).toBe(base.keyframes[0].handR[1] - 26);
    expect(inclined.props).toHaveLength(1);
    expect(inclined.props[0].h).toBeGreaterThan(0);
  });

  it('hides the far leg for a single-leg squat and the far arm for a single-arm pull', () => {
    expect(applyRigParams(PATTERNS.squat, { single: true }).hideFarLeg).toBe(true);
    expect(applyRigParams(PATTERNS.squat, { single: true }).hideFarArm).toBe(false);
    expect(applyRigParams(PATTERNS.pushup_horizontal, { single: true }).hideFarArm).toBe(true);
  });

});

describe('the pose selector reads any param key', () => {
  // 63 exercises rendered as 19 animations because the selector only looked at
  // `pose`, `shape` and `move` while the data names most variants with their own
  // key. See docs/spec/SPEC-07-param-audit.md.
  const frame = PATTERNS.squat.keyframes[0];
  const named = (tag: number) => [{ ...frame, headTilt: tag }];

  const fixture: RigPattern = {
    ...PATTERNS.squat,
    id: 'fixture',
    poses: {
      vup: named(1),
      alternateVup: named(2),
      curtsy: named(3),
      superman: named(4),
      alternate: named(5),
    },
  };

  const tagOf = (params: Record<string, unknown>) =>
    applyRigParams(fixture, params).keyframes[0].headTilt;

  it('selects on a boolean key name', () => {
    expect(tagOf({ vup: true })).toBe(1);
  });

  it('selects on a string value', () => {
    expect(tagOf({ direction: 'curtsy' })).toBe(3);
  });

  it('prefers the joined name when two keys refine together', () => {
    // Jackknife is `{ vup, alternate }` and must not resolve to the plain V-up.
    expect(tagOf({ vup: true, alternate: true })).toBe(2);
  });

  it('prefers a refinement over the explicit selector', () => {
    // Swimmer is `{ shape: 'superman', alternate: true }`. Letting `shape` win
    // is the exact collision the refinement exists to break.
    expect(tagOf({ shape: 'superman', alternate: true })).toBe(5);
  });

  it('falls back to the explicit selector when no refinement matches', () => {
    expect(tagOf({ shape: 'superman', cross: true })).toBe(4);
  });

  it('tries pairs, not just the full join and the singles', () => {
    // With three refinements the full join misses and the singles would have
    // been tried next, skipping every pair in between.
    const three: RigPattern = { ...fixture, poses: { ...fixture.poses, alternateVup: named(2) } };
    expect(
      applyRigParams(three, { vup: true, alternate: true, rock: true }).keyframes[0].headTilt,
    ).toBe(2);
  });

  it('never lets a handled param select a pose', () => {
    const shadowed: RigPattern = { ...fixture, poses: { ...fixture.poses, hands: named(9) } };
    expect(applyRigParams(shadowed, { hands: 'wide' }).keyframes[0].headTilt).toBe(
      frame.headTilt,
    );
  });

  it('leaves an unmatched key a no-op', () => {
    expect(tagOf({ nonsense: true })).toBe(frame.headTilt);
    expect(applyRigParams(PATTERNS.squat, { cossack: true }).keyframes).toEqual(
      PATTERNS.squat.keyframes,
    );
  });
});
