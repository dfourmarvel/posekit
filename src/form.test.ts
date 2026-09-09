import { describe, expect, it } from 'vitest';
import type { RigPattern, RigParams } from './types';
import { poseAt } from './pose';
import { BOUNDS, GROUND_Y, RIG, buildSkeleton, skeletonPoints, type Skeleton } from './solve';
import { figureGeometry } from './draw';
import { applyRigParams } from './params';
import { PATTERNS } from './patterns';

/**
 * These assert that the figure is a plausible human doing the named exercise.
 * The original suite only checked that it stayed inside its box, which let a
 * 24° pike, an inverted knee and a permanent partial rep all ship green.
 */

const patterns = Object.values(PATTERNS);
const SAMPLES = 32;

/**
 * Every pattern, plus each of its named `poses` entries as a pattern in its own
 * right. A stretch library holds a dozen poses behind one id, and an invariant
 * that only ever sees the default keyframes would wave all of them through.
 */
const variants: RigPattern[] = patterns.flatMap((p) => [
  p,
  ...Object.entries(p.poses ?? {}).map(([name, keyframes]) => ({
    ...p,
    id: `${p.id}:${name}`,
    keyframes,
    poses: undefined,
  })),
]);

/** Interior angle at b, in degrees. */
function angleAt(
  a: readonly [number, number],
  b: readonly [number, number],
  c: readonly [number, number],
): number {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const mag = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
  if (mag === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

/** Signed perpendicular offset of p from the a→b line. Positive = clockwise side. */
function sideOf(
  a: readonly [number, number],
  b: readonly [number, number],
  p: readonly [number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

function sample(pattern: RigPattern, i: number, params?: RigParams): Skeleton {
  const r = params ? applyRigParams(pattern, params) : pattern;
  const pose = poseAt(r, (r.cycleMs * i) / SAMPLES);
  return buildSkeleton(pose, r.footDir, r.view, r.toe);
}

function eachSample(pattern: RigPattern, fn: (s: Skeleton, i: number) => void) {
  for (let i = 0; i <= SAMPLES; i += 1) fn(sample(pattern, i), i);
}

describe('bone lengths are preserved', () => {
  // A fractional bend puts the joint at l1 from the root but leaves the second
  // segment the wrong length — a 31-long shin rendered 9 long at bend 0.
  it.each(variants.map((p) => [p.id, p] as const))('%s keeps every bone rigid', (_id, pattern) => {
    eachSample(pattern, (s) => {
      for (const [limb, l1, l2] of [
        [s.armR, RIG.upperArm, RIG.foreArm],
        [s.armL, RIG.upperArm, RIG.foreArm],
        [s.legR, RIG.thigh, RIG.shin],
        [s.legL, RIG.thigh, RIG.shin],
      ] as const) {
        expect(Math.hypot(limb.jointX - limb.rootX, limb.jointY - limb.rootY)).toBeCloseTo(l1, 3);
        expect(Math.hypot(limb.endX - limb.jointX, limb.endY - limb.jointY)).toBeCloseTo(l2, 3);
      }
    });
  });
});

describe('straight-body patterns hold the body line', () => {
  const straightBody = ['pushup_horizontal', 'plank_hold', 'plank_forearm'];

  it.each(straightBody)('%s keeps shoulder, hip and ankle collinear', (id) => {
    const pattern = PATTERNS[id];
    expect(pattern).toBeDefined();
    eachSample(pattern, (s) => {
      // 180° means perfectly straight. Piking or sagging is the exact fault
      // these exercises train against, so allow very little.
      const bodyAngle = angleAt(
        [s.shoulderX, s.shoulderY],
        [s.hipX, s.hipY],
        [s.legR.endX, s.legR.endY],
      );
      expect(bodyAngle).toBeGreaterThan(176);
    });
  });

  it.each(straightBody)('%s keeps the legs extended', (id) => {
    eachSample(PATTERNS[id], (s) => {
      // Measured as how far the knee sits off the hip-to-ankle line, not as an
      // angle: interpolating the hip along a chord between two arc positions
      // shortens the leg fractionally mid-rep, which costs a few degrees but is
      // well under a pixel of visible bend against a 14-wide limb.
      const bulge = Math.abs(
        sideOf([s.legR.rootX, s.legR.rootY], [s.legR.endX, s.legR.endY], [s.legR.jointX, s.legR.jointY]),
      );
      expect(bulge).toBeLessThan(3.5);
    });
  });

  it.each(straightBody)('%s keeps the toes on the floor', (id) => {
    eachSample(PATTERNS[id], (s) => {
      expect(s.legR.tipY).toBeCloseTo(GROUND_Y, 0);
      expect(s.legL.tipY).toBeCloseTo(GROUND_Y, 0);
    });
  });
});

describe('joint ranges are anatomically possible', () => {
  it.each(variants.map((p) => [p.id, p] as const))('%s never over-flexes a joint', (_id, p) => {
    eachSample(p, (s) => {
      for (const limb of [s.armR, s.armL] as const) {
        const elbow = angleAt(
          [limb.rootX, limb.rootY],
          [limb.jointX, limb.jointY],
          [limb.endX, limb.endY],
        );
        // Full elbow flexion is roughly 30°; below that the hand is inside the
        // shoulder. The incline push-up used to reach 5.7°.
        expect(elbow).toBeGreaterThan(28);
      }
      for (const limb of [s.legR, s.legL] as const) {
        const knee = angleAt(
          [limb.rootX, limb.rootY],
          [limb.jointX, limb.jointY],
          [limb.endX, limb.endY],
        );
        expect(knee).toBeGreaterThan(25);
      }
    });
  });

  it('a push-up locks out at the top and reaches depth at the bottom', () => {
    const p = PATTERNS.pushup_horizontal;
    const elbowAt = (i: number) => {
      const s = sample(p, i);
      return angleAt(
        [s.armR.rootX, s.armR.rootY],
        [s.armR.jointX, s.armR.jointY],
        [s.armR.endX, s.armR.endY],
      );
    };
    expect(elbowAt(0)).toBeGreaterThan(155);
    expect(elbowAt(SAMPLES / 2)).toBeLessThan(100);
    expect(elbowAt(SAMPLES / 2)).toBeGreaterThan(75);
  });
});

describe('bend direction is absolute, not merely symmetric', () => {
  // Negating every bend sign globally passed the whole original suite, because
  // the only bend test asserted that ±1 mirror each other — invariant under
  // negation. This pins the actual side the joint must fall on.
  it('a squat tracks the knee forward of the hip-to-ankle line', () => {
    // Checked at the bottom, where the knee must be clearly anterior. Near the
    // top the leg is straight, so the offset is legitimately close to zero.
    const s = sample(PATTERNS.squat, SAMPLES / 2);
    const offset = sideOf(
      [s.legR.rootX, s.legR.rootY],
      [s.legR.endX, s.legR.endY],
      [s.legR.jointX, s.legR.jointY],
    );
    expect(offset).toBeGreaterThan(15);
  });

  it('a push-up tracks the elbow behind the shoulder-to-hand line', () => {
    const p = PATTERNS.pushup_horizontal;
    const s = sample(p, SAMPLES / 2);
    expect(s.armR.jointX).toBeLessThan(s.armR.endX);
  });
});

describe('the legs extend away from the head', () => {
  // The glute bridge shipped with its feet on the same side as its head, so the
  // legs folded back over the torso into an unreadable knot. Every invariant
  // passed, because a body folded in half is still geometrically a valid human.
  //
  // Measured as the angle at the hip, not as the hip→ankle vector projected onto
  // the torso axis. The projection was the first version and it conflates two
  // different things: a leg doubled back *alongside* the torso, which is the
  // fault, and a leg raised *across* it, which is half the core exercises in the
  // library. Four poses here fail it while being correct — `crunch:legsUp`
  // projects at 45.2 and `crunch:vup` at 27.2, against its limit of 8.
  //
  // Two things this rule is NOT, both worth knowing before trusting it:
  //
  // It is not roomy. The tightest legitimate reading in the library is
  // `crunch:legsUp` at 40.0° — a toe-touch crunch, legs vertical over a curled
  // torso — so the real headroom over this 35° floor is five degrees. The next
  // pose up is `crunch:vup` at 59.9°, and before the core poses existed the
  // tightest was `stretch_standing:hamstring` at 83.4°; quoting either would
  // overstate the room by a factor of five. Anything tighter than legsUp needs a
  // deliberate look, not a passing build.
  //
  // It is not strictly stronger than what it replaced. It rejects the historical
  // bug decisively — the bridge that shipped with its feet on the head's side
  // scores 8.6° — but a supine figure at hip [152,158] with a foot at [175,140]
  // scores 38.0° and passes here while the projection caught it, and that pose is
  // a shin lying along the ribs. Closing the gap with a second rule was measured
  // and rejected: the knee-inside-torso distance that would reject it is 6.2,
  // and the tightest legitimate pose in the library, `crunch:bicycle`, sits at
  // 7.1. A rule with one unit of margin is not a rule.
  it.each(variants.map((p) => [p.id, p] as const))('%s never folds the legs back', (_id, p) => {
    eachSample(p, (s) => {
      for (const leg of [s.legR, s.legL] as const) {
        const hipAngle = angleAt(
          [s.shoulderX, s.shoulderY],
          [s.hipX, s.hipY],
          [leg.endX, leg.endY],
        );
        expect(hipAngle).toBeGreaterThan(35);
      }
    });
  });
});

describe('what is drawn is what was tested', () => {
  // The renderer solved its own skeleton inside the paint call and dropped `toe`
  // on the way, so every tucked-toe pattern was asserted on the balls of its
  // feet and drawn flat-footed. Nothing in this suite could see it: the
  // assertions and the renderer built two different skeletons from one pose.
  // These go through figureGeometry — the function the component paints with.
  const tucked = variants.filter((p) => p.toe === 'tucked');

  it('covers at least one tucked pattern', () => {
    expect(tucked.length).toBeGreaterThan(0);
  });

  it.each(tucked.map((p) => [p.id, p] as const))('%s is drawn on its toes', (_id, p) => {
    const r = applyRigParams(p, {});
    for (let i = 0; i <= SAMPLES; i += 1) {
      const pose = poseAt(r, (r.cycleMs * i) / SAMPLES);
      const s = buildSkeleton(pose, r.footDir, r.view, r.toe);
      const [, tip] = figureGeometry(pose, r).bones.footR.split(' ');
      const [tipX, tipY] = tip.split(',').map(Number);
      expect(tipX).toBeCloseTo(s.legR.tipX, 6);
      // A tucked foot angles down off the ankle; a flat one runs level with it,
      // so equality here is the bug.
      expect(tipY).toBeGreaterThan(s.legR.endY);
    }
  });

  it('draws the load band on the bone the pattern names', () => {
    const r = applyRigParams(PATTERNS.squat, {});
    const bottom = r.keyframes[r.keyframes.length - 1];
    const s = buildSkeleton(bottom, r.footDir, r.view, r.toe);
    expect(figureGeometry(bottom, r).load).toBe(
      `${s.legR.rootX},${s.legR.rootY} ${s.legR.jointX},${s.legR.jointY}`,
    );
    const jack = applyRigParams(PATTERNS.jumping_jack, {});
    expect(figureGeometry(jack.keyframes[0], jack).load).toBeNull();
  });
});

describe('limbs do not collapse between keyframes', () => {
  // Three patterns have now shipped where the hand travels in a straight line
  // from one keyframe to the next and that chord passes close to the shoulder,
  // folding the elbow far tighter mid-rep than at either end and then reopening
  // it. The arm appears to collapse and recover. Each keyframe was fine, so
  // nothing that only inspects keyframes could see it.
  const elbowAngle = (s: Skeleton) =>
    angleAt(
      [s.armR.rootX, s.armR.rootY],
      [s.armR.jointX, s.armR.jointY],
      [s.armR.endX, s.armR.endY],
    );

  it.each(patterns.map((p) => [p.id, p] as const))('%s sweeps, not folds', (_id, p) => {
    const atKeyframes = p.keyframes.map((pose) =>
      elbowAngle(buildSkeleton(pose, p.footDir, p.view, p.toe)),
    );
    let worst = 999;
    eachSample(p, (s) => {
      worst = Math.min(worst, elbowAngle(s));
    });
    // A little give: interpolating between two arc positions always cuts a
    // slight chord. A big dip means the path is crossing the shoulder.
    expect(worst).toBeGreaterThan(Math.min(...atKeyframes) - 25);
  });
});

describe('the elbow never passes through the torso', () => {
  // Front view only. Seen from the side the shoulder sits directly above the
  // hip, so an arm hanging at the side legitimately overlaps the trunk — a real
  // body has depth and an anteriorly-placed shoulder that this view cannot show.
  // Front-on there is no such excuse: an elbow crossing the midline is the arm
  // passing through the body, which is what this rule was written to catch.
  const frontal = patterns.filter((p) => p.view === 'front');

  it.each(frontal.map((p) => [p.id, p] as const))('%s keeps elbows clear', (_id, p) => {
    eachSample(p, (s) => {
      const torso = [s.shoulderX - s.hipX, s.shoulderY - s.hipY];
      const torsoLen = Math.hypot(torso[0], torso[1]) || 1;
      for (const limb of [s.armR, s.armL] as const) {
        // Where the elbow falls along the hip→shoulder axis. The torso capsule
        // only exists between the two, so an elbow reaching past the shoulder —
        // arms overhead, or extended forward while prone — has nothing to pass
        // through. An earlier version had this condition inverted and so only
        // ever checked the one region where the rule does not apply.
        const along =
          ((limb.jointX - s.hipX) * torso[0] + (limb.jointY - s.hipY) * torso[1]) / torsoLen;
        if (along < 4 || along > torsoLen - 4) continue;

        const dist = Math.abs(
          sideOf([s.hipX, s.hipY], [s.shoulderX, s.shoulderY], [limb.jointX, limb.jointY]),
        );
        expect(dist).toBeGreaterThan(6);
      }
    });
  });
});

describe('interpolation actually reaches the authored positions', () => {
  // Replacing the cosine easing with a linear ramp, a triangle, or a
  // half-amplitude cosine passed every original assertion, so a rep that only
  // travelled half its authored range would have shipped green.
  it.each(patterns.filter((p) => p.keyframes.length === 2).map((p) => [p.id, p] as const))(
    '%s reaches its end position at mid-cycle',
    (_id, p) => {
      expect(poseAt(p, p.cycleMs / 2)).toEqual(p.keyframes[1]);
    },
  );

  // Not pinned to one pattern's keyframe count: patterns gain intermediate poses
  // when a hand's straight-line path between two of them would cut across the
  // shoulder, and an assertion naming the count fails on the fix rather than on
  // the fault.
  const sequences = patterns.filter((p) => p.keyframes.length > 2);

  it('covers at least one multi-keyframe pattern', () => {
    expect(sequences.length).toBeGreaterThan(0);
  });

  it.each(sequences.map((p) => [p.id, p] as const))(
    '%s reaches its far keyframe at mid-cycle',
    (_id, p) => {
      expect(poseAt(p, p.cycleMs / 2)).toEqual(p.keyframes[p.keyframes.length - 1]);
    },
  );

  it('survives non-finite and extreme timestamps', () => {
    for (const t of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -1e12]) {
      for (const p of patterns) {
        const pose = poseAt(p, t);
        expect(Number.isFinite(pose.hip[0])).toBe(true);
        expect(Number.isFinite(pose.torsoAngle)).toBe(true);
      }
    }
  });
});

describe('every pattern and documented variant stays drawable', () => {
  const VARIANTS: RigParams[] = [
    {},
    { hands: 'wide' },
    { hands: 'narrow' },
    { hands: 'diamond' },
    { hands: 'staggered' },
    { hands: 'archer' },
    { hands: 'low' },
    { elevate: 'hands' },
    { elevate: 'feet' },
    { elevate: 'shoulders' },
    { range: 'pulse' },
    { range: 'full' },
    { tempo: 'explosive' },
    { hold: true },
    { single: true },
    { load: 'front' },
    { load: 'back' },
  ];

  // The original bounds check covered one pattern with one param set, which is
  // how a decline plank with its toe clipped off the viewBox edge shipped.
  // Sampled denser than the rest of the suite. Two narrower bounds sweeps used to
  // sit in pose.test.ts at 48 and 24 samples; this is now the only one, so it
  // takes the densest of those rather than quietly dropping sample points along
  // with the duplication.
  const BOUNDS_SAMPLES = 48;

  it.each(variants.map((p) => [p.id, p] as const))('%s stays in bounds for all variants', (_id, p) => {
    for (const params of VARIANTS) {
      const r = applyRigParams(p, params);
      for (let i = 0; i <= BOUNDS_SAMPLES; i += 1) {
        const pose = poseAt(r, (r.cycleMs * i) / BOUNDS_SAMPLES);
        const points = skeletonPoints(buildSkeleton(pose, r.footDir, r.view, r.toe));
        for (const [x, y] of points) {
          expect(x, `${p.id} ${JSON.stringify(params)}`).toBeGreaterThanOrEqual(BOUNDS.minX);
          expect(x, `${p.id} ${JSON.stringify(params)}`).toBeLessThanOrEqual(BOUNDS.maxX);
          expect(y, `${p.id} ${JSON.stringify(params)}`).toBeGreaterThanOrEqual(BOUNDS.minY);
          expect(y, `${p.id} ${JSON.stringify(params)}`).toBeLessThanOrEqual(BOUNDS.maxY);
        }
      }
      for (const prop of r.props) {
        expect(prop.x, `${p.id} prop`).toBeGreaterThanOrEqual(BOUNDS.minX - 12);
        expect(prop.x + prop.w, `${p.id} prop`).toBeLessThanOrEqual(BOUNDS.maxX + 12);
      }
    }
  });
});

describe('variants depict the movement they name', () => {
  it('a hold freezes at the working position, not the start', () => {
    const held = applyRigParams(PATTERNS.squat, { hold: true });
    const s = buildSkeleton(held.keyframes[0], held.footDir, held.view, held.toe);
    const knee = angleAt(
      [s.legR.rootX, s.legR.rootY],
      [s.legR.jointX, s.legR.jointY],
      [s.legR.endX, s.legR.endY],
    );
    // A wall sit is a bent-knee hold. Collapsing to keyframe 0 drew it standing
    // with the knee at 163°.
    expect(knee).toBeLessThan(120);
  });

  it('an elevated press stays a possible arm position', () => {
    for (const elevate of ['hands', 'feet'] as const) {
      const r = applyRigParams(PATTERNS.pushup_horizontal, { elevate });
      for (let i = 0; i <= SAMPLES; i += 1) {
        const pose = poseAt(r, (r.cycleMs * i) / SAMPLES);
        const s = buildSkeleton(pose, r.footDir, r.view, r.toe);
        const elbow = angleAt(
          [s.armR.rootX, s.armR.rootY],
          [s.armR.jointX, s.armR.jointY],
          [s.armR.endX, s.armR.endY],
        );
        expect(elbow, `elevate: ${elevate}`).toBeGreaterThan(28);
      }
    }
  });

  it('single-limb variants hide a limb on patterns that declare one', () => {
    expect(applyRigParams(PATTERNS.squat, { single: true }).hideFarLeg).toBe(true);
    expect(applyRigParams(PATTERNS.pushup_horizontal, { single: true }).hideFarArm).toBe(true);
  });
});

describe('front-view patterns read as front-facing', () => {
  // Catches a front pattern authored with side-view coordinates. It cannot apply
  // to movements that are asymmetric by definition — a Cossack squat sinks into
  // one hip while the other leg extends sideways — so those declare
  // `symmetry: 'free'` and are exempted here. Opting out is a visible line in the
  // pattern rather than a quietly loosened tolerance for everyone.
  it.each(
    patterns
      .filter((p) => p.view === 'front' && p.symmetry !== 'free')
      .map((p) => [p.id, p] as const),
  )(
    '%s is symmetric about the midline',
    (_id, p) => {
      for (const f of p.keyframes) {
        expect(f.handR[0] + f.handL[0]).toBeCloseTo(320, 1);
        expect(f.footR[0] + f.footL[0]).toBeCloseTo(320, 1);
        expect(f.hip[0]).toBeCloseTo(160, 1);
      }
    },
  );
});
