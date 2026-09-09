import { describe, expect, it } from 'vitest';
import type { Proportions, ResolvedPattern, RigPose } from './types';
import { applyRigParams } from './params';
import { PATTERNS } from './patterns';
import { poseAt } from './pose';
import { DEFAULT_PROPORTIONS, GROUND_Y, buildSkeleton, type Skeleton } from './solve';
import { OUTLINE, type Box, figureBounds, figureGeometry, viewBoxOf } from './draw';

/**
 * Coverage for `figureBounds` — the crop a `thumb`-size figure lives inside
 * (SPEC-07 §7.1 legibility). Three things matter: the box never moves during
 * an animation (or the figure visibly pulses), it never clips a stroke (or
 * the crop reads as a rendering bug), and it's actually tighter for a
 * lopsided pose (or the crop did nothing).
 */

const patterns = Object.values(PATTERNS);

/** Every registered pattern, plus each of its named `poses` sets resolved as a
 *  pattern in its own right — mirrors form.test.ts's `variants`, since a named
 *  pose set is real, selectable content the crop has to fit too. */
const variants: ResolvedPattern[] = patterns.flatMap((p) => {
  const named = Object.entries(p.poses ?? {}).map(([name, keyframes]) =>
    applyRigParams({ ...p, id: `${p.id}:${name}`, keyframes, poses: undefined }),
  );
  return [applyRigParams(p), ...named];
});

const EPS = 1e-6;

function expectInside(box: Box, x: number, y: number, pad: number, label: string) {
  expect(x - pad, `${label} left edge`).toBeGreaterThanOrEqual(box.x - EPS);
  expect(x + pad, `${label} right edge`).toBeLessThanOrEqual(box.x + box.w + EPS);
  expect(y - pad, `${label} top edge`).toBeGreaterThanOrEqual(box.y - EPS);
  expect(y + pad, `${label} bottom edge`).toBeLessThanOrEqual(box.y + box.h + EPS);
}

/**
 * Every joint/prop/held-load point a resolved pattern draws for one pose,
 * checked against `box` with padding computed independently of `figureBounds`
 * (straight from `proportions` and `OUTLINE`) so this can't pass by sharing a
 * bug with the code under test.
 */
function checkPoseInside(box: Box, pose: RigPose, r: ResolvedPattern, p: Proportions) {
  const { width } = p;
  const s: Skeleton = buildSkeleton(pose, r.footDir, r.view, r.toe, p);

  expectInside(box, s.hipX, s.hipY, width.torso / 2 + OUTLINE, 'hip');
  expectInside(box, s.shoulderX, s.shoulderY, width.torso / 2 + OUTLINE, 'shoulder');
  expectInside(box, s.headX, s.headY, p.headR + OUTLINE, 'head');

  const arms = r.hideFarArm ? [['armR', s.armR]] : [
    ['armR', s.armR],
    ['armL', s.armL],
  ];
  for (const [label, arm] of arms as Array<[string, Skeleton['armR']]>) {
    expectInside(box, arm.rootX, arm.rootY, width.arm / 2 + OUTLINE, `${label} root`);
    expectInside(box, arm.jointX, arm.jointY, width.arm / 2 + OUTLINE, `${label} elbow`);
    expectInside(
      box,
      arm.endX,
      arm.endY,
      Math.max(width.arm, width.hand) / 2 + OUTLINE,
      `${label} wrist`,
    );
    expectInside(box, arm.tipX, arm.tipY, width.hand / 2 + OUTLINE, `${label} hand`);
  }

  const legs = r.hideFarLeg ? [['legR', s.legR]] : [
    ['legR', s.legR],
    ['legL', s.legL],
  ];
  for (const [label, leg] of legs as Array<[string, Skeleton['legR']]>) {
    expectInside(box, leg.rootX, leg.rootY, width.leg / 2 + OUTLINE, `${label} root`);
    expectInside(box, leg.jointX, leg.jointY, width.leg / 2 + OUTLINE, `${label} knee`);
    expectInside(
      box,
      leg.endX,
      leg.endY,
      Math.max(width.leg, width.foot) / 2 + OUTLINE,
      `${label} ankle`,
    );
    expectInside(box, leg.tipX, leg.tipY, width.foot / 2 + OUTLINE, `${label} foot`);
  }

  // Props (support blocks) are flat, unstroked rects — no extra pad.
  for (const prop of r.props) {
    expectInside(box, prop.x, prop.y, 0, `${r.id} prop top-left`);
    expectInside(box, prop.x + prop.w, prop.y + prop.h, 0, `${r.id} prop bottom-right`);
  }

  const g = figureGeometry(pose, r, p);
  if (g.held) {
    const [hx, hy] = g.held;
    // 26x20 rect, stroke-width 2 (see ExerciseFigure's `build`).
    expectInside(box, hx, hy, 1, `${r.id} held top-left`);
    expectInside(box, hx + 26, hy + 20, 1, `${r.id} held bottom-right`);
  }
  if (r.heldLoad === 'hands') {
    for (const w of g.weights) {
      if (r.implement === 'jug' || r.implement === 'bottle') {
        const radius = r.implement === 'jug' ? 8 : 6;
        expectInside(box, w.cx, w.cy, radius, `${r.id} ${r.implement}`);
      } else {
        // 17x19 pack centred on (cx, cy), plus a strap that pokes 1.1 past
        // its top edge (see ExerciseFigure's `build`/`paint`).
        expectInside(box, w.cx - 8.5, w.cy - 9.5 - 1.1, 0, `${r.id} pack top-left`);
        expectInside(box, w.cx + 8.5, w.cy + 9.5, 0, `${r.id} pack bottom-right`);
      }
    }
  }
}

/**
 * A deliberately naive stand-in for what a "per-frame" bounds computation
 * would do: bound *only* the one pose handed to it, padded the same way
 * `figureBounds` pads a keyframe. Used below purely to demonstrate that real
 * patterns move enough for such a box to differ from moment to moment — it is
 * never used to decide what the real crop should be.
 */
function boxForSinglePose(pose: RigPose, r: ResolvedPattern, p: Proportions): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, pad: number) => {
    minX = Math.min(minX, x - pad);
    maxX = Math.max(maxX, x + pad);
    minY = Math.min(minY, y - pad);
    maxY = Math.max(maxY, y + pad);
  };

  const { width } = p;
  const s: Skeleton = buildSkeleton(pose, r.footDir, r.view, r.toe, p);
  grow(s.hipX, s.hipY, width.torso / 2 + OUTLINE);
  grow(s.shoulderX, s.shoulderY, width.torso / 2 + OUTLINE);
  grow(s.headX, s.headY, p.headR + OUTLINE);
  for (const arm of [s.armR, s.armL]) {
    grow(arm.rootX, arm.rootY, width.arm / 2 + OUTLINE);
    grow(arm.jointX, arm.jointY, width.arm / 2 + OUTLINE);
    grow(arm.endX, arm.endY, Math.max(width.arm, width.hand) / 2 + OUTLINE);
    grow(arm.tipX, arm.tipY, width.hand / 2 + OUTLINE);
  }
  for (const leg of [s.legR, s.legL]) {
    grow(leg.rootX, leg.rootY, width.leg / 2 + OUTLINE);
    grow(leg.jointX, leg.jointY, width.leg / 2 + OUTLINE);
    grow(leg.endX, leg.endY, Math.max(width.leg, width.foot) / 2 + OUTLINE);
    grow(leg.tipX, leg.tipY, width.foot / 2 + OUTLINE);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const boxSignature = (b: Box) =>
  `${b.x.toFixed(3)},${b.y.toFixed(3)},${b.w.toFixed(3)},${b.h.toFixed(3)}`;

describe('figureBounds is fixed for the life of the pattern (anti-pulse)', () => {
  // Prone (pushup_horizontal), standing (squat), plus two more for margin —
  // jumping_jack and shoulder_mobility carry more than two keyframes, so they
  // exercise more than one interpolated segment.
  const ids = ['pushup_horizontal', 'squat', 'plank_forearm', 'jumping_jack'] as const;

  it.each(ids)('%s: the render-path box does not change across a full animation cycle', (id) => {
    const pattern = PATTERNS[id];
    expect(pattern).toBeDefined();
    const r = applyRigParams(pattern, {});
    // This is exactly what ExerciseFigure's `box` computes once — a useMemo
    // keyed only on [resolved, proportions], never on elapsed time or pose —
    // and hands to the <svg viewBox>, so this is the value the render path
    // actually uses for the whole life of the mounted figure.
    const renderBox = figureBounds(r);
    // Each iteration recomputes figureBounds from scratch (deliberately, to
    // check it stays pure/idempotent) at its full interpolated-sampling cost,
    // so this stays small — the density that matters for coverage is tested
    // separately below, not here.
    const SAMPLES = 6;

    for (let i = 0; i <= SAMPLES; i += 1) {
      // Exercise the same time-stepping a mounted figure's rAF loop would —
      // calling poseAt here is what a per-frame bug would need to leak
      // through into the box (e.g. via cached/shared state), so unlike the
      // box's own reference this line matters to the assertion below.
      poseAt(r, (r.cycleMs * i) / SAMPLES);
      expect(figureBounds(r)).toEqual(renderBox);
    }
  });

  it.each(ids)(
    '%s: proves the check has teeth — a naive per-frame box really does drift across the cycle',
    (id) => {
      const pattern = PATTERNS[id];
      const r = applyRigParams(pattern, {});
      const SAMPLES = 24;
      const boxes: Box[] = [];
      for (let i = 0; i <= SAMPLES; i += 1) {
        const t = (r.cycleMs * i) / SAMPLES;
        boxes.push(boxForSinglePose(poseAt(r, t), r, DEFAULT_PROPORTIONS));
      }
      // If a figure's viewBox were recomputed from only the pose being
      // painted that frame, instead of the one fixed `figureBounds` rect,
      // these are the boxes it would end up drawing into — and they differ,
      // which is exactly what would make the figure visibly pulse and drift.
      // This is what makes the invariant above a real property of moving
      // patterns rather than a tautology of figureBounds's own signature.
      const distinct = new Set(boxes.map(boxSignature));
      expect(distinct.size).toBeGreaterThan(1);
    },
  );
});

describe('figureBounds contains every drawn point of every keyframe (registry-wide)', () => {
  const p = DEFAULT_PROPORTIONS;

  it.each(variants.map((r) => [r.id, r] as const))('%s stays inside its own box', (_id, r) => {
    const box = figureBounds(r, p);
    expect(box.w).toBeGreaterThan(0);
    expect(box.h).toBeGreaterThan(0);

    for (const pose of r.keyframes) checkPoseInside(box, pose, r, p);
  });
});

describe('figureBounds contains every drawn point of the interpolated animation (registry-wide)', () => {
  // The IK solve is nonlinear, so a mid-animation pose can land outside the
  // union of its two endpoint keyframes (SPEC-07 defect: overhead_press,
  // reverse_crunch, plank_dynamic and supine_hamstring all measurably
  // overflowed a keyframes-only box). Every registered pattern — not a
  // hand-picked subset — gets a dense sweep of a full cycle here.
  const p = DEFAULT_PROPORTIONS;
  // figureBounds itself already samples densely (800 points per interpolated
  // segment, see draw.ts) and carries its own safety margin for the gaps
  // between samples — this pass exists to catch a regression in *what* gets
  // unioned (e.g. reverting to keyframes-only), not to out-resolve it, so a
  // lighter sweep across the registry is enough.
  const SAMPLES = 60;

  it.each(variants.map((r) => [r.id, r] as const))(
    '%s stays inside its own box across a full cycle',
    (_id, r) => {
      const box = figureBounds(r, p);

      for (let i = 0; i <= SAMPLES; i += 1) {
        const t = (r.cycleMs * i) / SAMPLES;
        checkPoseInside(box, poseAt(r, t), r, p);
      }
    },
  );
});

describe('figureBounds always includes the ground line', () => {
  // The ground line spans the box at a fixed y = GROUND_Y (see ExerciseFigure's
  // `build`), drawn unconditionally for every pattern today. The old, fixed
  // viewBox always contained it for free; a computed box has to be checked. A
  // future pattern that opts out of the ground line would need to opt out of
  // this check too, rather than silently losing it off the edge of the crop.
  it.each(variants.map((r) => [r.id, r] as const))('%s: GROUND_Y sits inside the box', (_id, r) => {
    const box = figureBounds(r, DEFAULT_PROPORTIONS);
    expect(GROUND_Y, `${r.id} ground y`).toBeGreaterThanOrEqual(box.y - EPS);
    expect(GROUND_Y, `${r.id} ground y`).toBeLessThanOrEqual(box.y + box.h + EPS);
  });
});

describe('a landscape thumb slot fits both body shapes', () => {
  it('a prone pattern is materially wider than tall', () => {
    const r = applyRigParams(PATTERNS.pushup_horizontal, {});
    const box = figureBounds(r);
    expect(box.w).toBeGreaterThan(box.h * 1.5);
  });

  it('a standing pattern is materially taller than wide', () => {
    const r = applyRigParams(PATTERNS.squat, {});
    const box = figureBounds(r);
    expect(box.h).toBeGreaterThan(box.w * 1.3);
  });
});

describe('the viewBox survives a round trip through the server', () => {
  // Every figure on /dev/rig logged a React hydration mismatch, because the
  // box's last float digit differed between the Node that rendered the HTML
  // and the browser that hydrated it, and React compares the attribute as a
  // string. Asserting the box is *correct* could never have caught it: both
  // values were correct to within 3e-15. What matters is that the text is
  // stable and short, so these assert the text.
  it.each(variants.map((r) => [r.id, r] as const))(
    '%s: viewBox carries at most 2 decimals',
    (_id, r) => {
      const vb = viewBoxOf(figureBounds(r, DEFAULT_PROPORTIONS));
      expect(vb, r.id).toMatch(/^-?\d+(\.\d{2})? -?\d+(\.\d{2})? -?\d+(\.\d{2})? -?\d+(\.\d{2})?$/);
    },
  );

  it('a difference far below one rendered pixel produces identical text', () => {
    // The actual failure: 144.76309695303922 vs 144.76309695303925.
    const box: Box = { x: 77.34999999999997, y: 115.68939135594269, w: 144.76309695303925, h: 63.9606086440573 };
    const jittered: Box = { ...box, x: 77.34999999999998, w: 144.76309695303922 };
    expect(viewBoxOf(box)).toBe(viewBoxOf(jittered));
  });

  it('still separates boxes that differ visibly', () => {
    const a: Box = { x: 0, y: 0, w: 100, h: 50 };
    const b: Box = { x: 0, y: 0, w: 100.02, h: 50 };
    expect(viewBoxOf(a)).not.toBe(viewBoxOf(b));
  });
});
