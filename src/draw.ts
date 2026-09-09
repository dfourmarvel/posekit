import type { LoadBone, Proportions, RigPose, RigView, ResolvedPattern } from './types';
import { lerpPose } from './pose';
import { DEFAULT_PROPORTIONS, buildSkeleton, type Limb, type Skeleton } from './solve';

/** The dark halo drawn under every stroke (ExerciseFigure draws it as a second,
 *  fatter polyline). Shared with the bounds calc below so a crop never clips it. */
export const OUTLINE = 2.5;

/**
 * Everything the renderer draws, as plain numbers and `points` strings.
 *
 * Split out of ExerciseFigure so the drawn figure can be asserted against
 * directly. It could not be before: the component solved its own skeleton inside
 * a DOM-mutating paint call and dropped `toe` on the way, so every tucked-toe
 * pattern was *tested* on the balls of its feet and *drawn* flat-footed, with
 * nothing in the suite able to see the difference.
 */

/** How far beyond the hand the implement's centre sits, along the forearm. */
const IMPLEMENT_REACH = 7;

export type HeldImplement = { cx: number; cy: number; strap: string };

export type FigureGeometry = {
  /** Keyed by part name; values are SVG `points` attributes. */
  bones: Record<string, string>;
  head: readonly [number, number];
  eyes: Array<readonly [number, number]>;
  /** The band along the working bone, or null when the pattern carries no load. */
  load: string | null;
  /** Top-left of a worn weight, or null. */
  held: readonly [number, number] | null;
  /** Far side first, matching the order the renderer builds the elements in. */
  weights: HeldImplement[];
};

const pts = (...xy: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < xy.length; i += 2) out.push(`${xy[i]},${xy[i + 1]}`);
  return out.join(' ');
};

export const limbPts = (l: Limb) => pts(l.rootX, l.rootY, l.jointX, l.jointY, l.endX, l.endY);
export const tipPts = (l: Limb) => pts(l.endX, l.endY, l.tipX, l.tipY);
export const bonePts = pts;

/**
 * Side view shows one eye on the leading side of the head, front view shows two —
 * which is what tells a viewer whether a symmetric pose like a jumping jack is
 * seen from the front or from behind. The figure always faces +x in side view.
 */
export function eyePositions(
  s: Skeleton,
  view: RigView,
  proportions: Proportions = DEFAULT_PROPORTIONS,
): Array<readonly [number, number]> {
  const dx = proportions.headR * 0.42;
  const dy = -proportions.headR * 0.12;
  if (view === 'front') {
    return [
      [s.headX + dx * 0.8, s.headY + dy],
      [s.headX - dx * 0.8, s.headY + dy],
    ];
  }
  return [[s.headX + dx, s.headY + dy]];
}

/** The near-side bone the amber load band runs along (SPEC-07 §7.3). */
export function loadBonePts(s: Skeleton, load: LoadBone): string | null {
  switch (load) {
    case 'none':
      return null;
    case 'torso':
      return pts(s.hipX, s.hipY, s.shoulderX, s.shoulderY);
    case 'upperArm':
      return pts(s.armR.rootX, s.armR.rootY, s.armR.jointX, s.armR.jointY);
    case 'foreArm':
      return pts(s.armR.jointX, s.armR.jointY, s.armR.endX, s.armR.endY);
    case 'thigh':
      return pts(s.legR.rootX, s.legR.rootY, s.legR.jointX, s.legR.jointY);
    default:
      return pts(s.legR.jointX, s.legR.jointY, s.legR.endX, s.legR.endY);
  }
}

/**
 * A held implement sits just beyond the hand *along the forearm*, not straight
 * down. Hanging it vertically reads fine on a lowered arm but drops the object
 * into the head on an overhead press, where the hand finishes above the skull.
 */
function implementAt(arm: Limb): HeldImplement {
  const ax = arm.tipX - arm.jointX;
  const ay = arm.tipY - arm.jointY;
  const alen = Math.hypot(ax, ay) || 1;
  const cx = arm.tipX + (ax / alen) * IMPLEMENT_REACH;
  const cy = arm.tipY + (ay / alen) * IMPLEMENT_REACH;
  return { cx, cy, strap: pts(cx - 5, cy - 9.5, cx + 5, cy - 9.5) };
}

export function figureGeometry(
  pose: RigPose,
  r: ResolvedPattern,
  proportions: Proportions = DEFAULT_PROPORTIONS,
): FigureGeometry {
  const s = buildSkeleton(pose, r.footDir, r.view, r.toe, proportions);

  return {
    bones: {
      torso: pts(s.hipX, s.hipY, s.shoulderX, s.shoulderY),
      armR: limbPts(s.armR),
      armL: limbPts(s.armL),
      legR: limbPts(s.legR),
      legL: limbPts(s.legL),
      handR: tipPts(s.armR),
      handL: tipPts(s.armL),
      footR: tipPts(s.legR),
      footL: tipPts(s.legL),
    },
    head: [s.headX, s.headY],
    eyes: eyePositions(s, r.view, proportions),
    load: loadBonePts(s, r.load),
    // A weight worn on the back is occluded by the torso; one held at the chest
    // is not. Same rect, opposite side of the figure.
    held:
      r.heldLoad === 'front'
        ? [s.shoulderX + 6, s.shoulderY + 4]
        : r.heldLoad === 'back'
          ? [s.shoulderX - 30, s.shoulderY - 10]
          : null,
    weights: r.heldLoad === 'hands' ? [implementAt(s.armL), implementAt(s.armR)] : [],
  };
}

export type Box = { x: number; y: number; w: number; h: number };

/** Rect/circle sizes ExerciseFigure actually draws for held loads, so the crop
 *  pads exactly as far as those elements really reach (SPEC-07 §7.4 props). */
const HELD_RECT = { w: 26, h: 20, strokeHalf: 1 };
const PACK_HALF = { x: 8.5, y: 9.5 };
const STRAP_HALF = 1.1;
const IMPLEMENT_R: Record<'jug' | 'bottle', number> = { jug: 8, bottle: 6 };

type BoxAcc = { minX: number; minY: number; maxX: number; maxY: number };

function grow(b: BoxAcc, x: number, y: number, pad: number): void {
  b.minX = Math.min(b.minX, x - pad);
  b.maxX = Math.max(b.maxX, x + pad);
  b.minY = Math.min(b.minY, y - pad);
  b.maxY = Math.max(b.maxY, y + pad);
}

function growRect(b: BoxAcc, x0: number, y0: number, x1: number, y1: number, pad: number): void {
  grow(b, x0, y0, pad);
  grow(b, x1, y1, pad);
}

/**
 * Bones and head only — the piece both a resolved pattern and the SPEC-07 §9
 * fallback silhouette need. Each element is padded by half its own stroke
 * width plus `OUTLINE`, since the outline is a second, fatter stroke drawn
 * under the fill (ExerciseFigure's `build`) and would otherwise clip.
 */
function addSkeletonFootprint(
  b: BoxAcc,
  s: Skeleton,
  p: Proportions,
  opts: { hideFarArm?: boolean; hideFarLeg?: boolean } = {},
): void {
  const halfTorso = p.width.torso / 2 + OUTLINE;
  const halfArm = p.width.arm / 2 + OUTLINE;
  const halfLeg = p.width.leg / 2 + OUTLINE;
  const halfHand = p.width.hand / 2 + OUTLINE;
  const halfFoot = p.width.foot / 2 + OUTLINE;

  grow(b, s.hipX, s.hipY, halfTorso);
  grow(b, s.shoulderX, s.shoulderY, halfTorso);
  grow(b, s.headX, s.headY, p.headR + OUTLINE);

  const arms = opts.hideFarArm ? [s.armR] : [s.armR, s.armL];
  for (const arm of arms) {
    grow(b, arm.rootX, arm.rootY, halfArm);
    grow(b, arm.jointX, arm.jointY, halfArm);
    // The wrist is the shared vertex of two differently-stroked segments.
    grow(b, arm.endX, arm.endY, Math.max(halfArm, halfHand));
    grow(b, arm.tipX, arm.tipY, halfHand);
  }

  const legs = opts.hideFarLeg ? [s.legR] : [s.legR, s.legL];
  for (const leg of legs) {
    grow(b, leg.rootX, leg.rootY, halfLeg);
    grow(b, leg.jointX, leg.jointY, halfLeg);
    grow(b, leg.endX, leg.endY, Math.max(halfLeg, halfFoot));
    grow(b, leg.tipX, leg.tipY, halfFoot);
  }
}

/** Support blocks and held implements sit outside the body's own bones, so a
 *  crop built only from `addSkeletonFootprint` would slice them off. */
function addPropsFootprint(
  b: BoxAcc,
  pose: RigPose,
  r: ResolvedPattern,
  p: Proportions,
): void {
  for (const prop of r.props) {
    // rx-rounded corners stay inside the rect and there's no stroke, so the
    // rect's own extent is the footprint.
    growRect(b, prop.x, prop.y, prop.x + prop.w, prop.y + prop.h, 0);
  }

  const g = figureGeometry(pose, r, p);
  if (g.held) {
    const [hx, hy] = g.held;
    growRect(b, hx, hy, hx + HELD_RECT.w, hy + HELD_RECT.h, HELD_RECT.strokeHalf);
  }
  if (r.heldLoad === 'hands') {
    for (const w of g.weights) {
      if (r.implement === 'jug' || r.implement === 'bottle') {
        grow(b, w.cx, w.cy, IMPLEMENT_R[r.implement]);
      } else {
        // The strap rides along the pack's top edge and pokes a little past it.
        growRect(
          b,
          w.cx - PACK_HALF.x,
          w.cy - PACK_HALF.y - STRAP_HALF,
          w.cx + PACK_HALF.x,
          w.cy + PACK_HALF.y,
          0,
        );
      }
    }
  }
}

/**
 * The consecutive keyframe pairs the real animation actually interpolates
 * across — `lerpPose(a, b, t)` for `t` in [0, 1] — plus the wrap-around pair
 * from the last frame back to the first for a `cycle` pattern, since
 * `poseAt` walks off the end of the array back to frame 0 for that loop mode.
 * A `pingpong` pattern never makes that wrap: it eases back down through the
 * same segments instead (see `poseAt`), so no extra pair is needed there.
 */
function segmentPairs(r: ResolvedPattern): Array<readonly [RigPose, RigPose]> {
  const frames = r.keyframes;
  if (frames.length < 2) return [];
  const pairs: Array<readonly [RigPose, RigPose]> = [];
  for (let i = 0; i < frames.length - 1; i += 1) pairs.push([frames[i], frames[i + 1]]);
  if (r.loop === 'cycle') pairs.push([frames[frames.length - 1], frames[0]]);
  return pairs;
}

/**
 * How many interior points `figureBounds` samples along each keyframe-pair's
 * interpolation. Both easing curves `poseAt` applies (cosine and explosive)
 * are monotonic-onto over their cycle — as elapsed time sweeps a full loop,
 * the eased phase still visits every value in [0, 1] at least once per
 * segment — so sampling `lerpPose(a, b, t)` directly at evenly spaced `t`
 * covers exactly the geometry the real animation draws, independent of
 * timing/easing and without touching the clock. A verifier sampling 800
 * *time* steps across a whole pattern's cycle (spread across however many
 * segments it has) is what surfaced the worst measured overflow
 * (overhead_press, 2.19 units); sampling that many *per segment* gives every
 * pattern at least as much resolution as found that overflow, however many
 * segments it has.
 */
const INTERPOLATION_SAMPLES = 800;

/**
 * A flat safety margin added to the sampled box on every side. Sampling at
 * evenly spaced `t` can still straddle a curve's true extremum — the worst
 * gap measured between two 800-sample-per-segment grids that don't land on
 * the same `t` values was ~0.004 units (plank_dynamic's trailing foot). This
 * margin is over an order of magnitude past that, so it absorbs any
 * remaining discretization gap — from this grid or a denser one sampled at
 * runtime — while staying a small fraction of `OUTLINE` itself and nowhere
 * near visible at thumb scale.
 */
const SAMPLE_MARGIN = 0.15;

/**
 * The tight, stroke-padded box a figure actually draws into — unioned over
 * every keyframe of the resolved pattern (already the selected `poses` set,
 * if any) *and* over the interpolated poses between them, since the IK solve
 * is nonlinear and a mid-animation pose can reach outside the union of its
 * two endpoint skeletons. The result is one fixed rect for the pattern's
 * whole animation cycle — recomputing per frame would make the figure
 * visibly pulse and drift.
 *
 * Pure and exported so it's directly testable without mounting the component.
 */
export function figureBounds(
  r: ResolvedPattern,
  proportions: Proportions = DEFAULT_PROPORTIONS,
): Box {
  const b: BoxAcc = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  const addPose = (pose: RigPose) => {
    const s = buildSkeleton(pose, r.footDir, r.view, r.toe, proportions);
    addSkeletonFootprint(b, s, proportions, {
      hideFarArm: r.hideFarArm,
      hideFarLeg: r.hideFarLeg,
    });
    addPropsFootprint(b, pose, r, proportions);
  };

  for (const pose of r.keyframes) addPose(pose);

  for (const [a, c] of segmentPairs(r)) {
    // i = 0 and i = SAMPLES land back on the endpoint keyframes already
    // covered above, so only the interior points add anything.
    for (let i = 1; i < INTERPOLATION_SAMPLES; i += 1) {
      addPose(lerpPose(a, c, i / INTERPOLATION_SAMPLES));
    }
  }

  return {
    x: b.minX - SAMPLE_MARGIN,
    y: b.minY - SAMPLE_MARGIN,
    w: b.maxX - b.minX + 2 * SAMPLE_MARGIN,
    h: b.maxY - b.minY + 2 * SAMPLE_MARGIN,
  };
}

/**
 * The `viewBox` attribute for a box, rounded to two decimals.
 *
 * Rounding is not cosmetic. The box falls out of a chain of trig and IK solves,
 * and its last float digit can differ between the Node that server-renders the
 * page and the browser that hydrates it — 144.76309695303922 against
 * ...925. React compares the attribute as a *string*, so every figure on the
 * page logged a hydration mismatch on load. Two decimals is a hundredth of a
 * rig unit, an order of magnitude below anything the renderer can draw.
 *
 * It lives here rather than inline in the component for the reason geometry
 * does: when the renderer formats its own attributes, nothing that tests the
 * geometry can see what actually shipped. That is the same shape as the bug
 * where `paint` built its own skeleton and silently dropped `toe`.
 */
export function viewBoxOf(box: Box): string {
  return [box.x, box.y, box.w, box.h].map((n) => n.toFixed(2)).join(' ');
}

/** Same box math as `figureBounds`, for the bare skeleton the SPEC-07 §9
 *  fallback silhouette draws — it carries no props or held load to union in. */
export function skeletonBounds(s: Skeleton, proportions: Proportions = DEFAULT_PROPORTIONS): Box {
  const b: BoxAcc = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  addSkeletonFootprint(b, s, proportions);
  return { x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY };
}
