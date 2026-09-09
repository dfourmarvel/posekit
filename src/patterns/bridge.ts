import type { RigPattern, RigPose } from '../types';
import { raiseFootContact } from '../solve';

/**
 * Carries 5 exercises: glute bridge, frog pump, glute bridge march and the
 * single-leg and elevated variants. Hip thrust left for `hip_thrust`, which
 * pivots on a shoulder resting on a couch — a different chain, not a variant.
 *
 * Supine with the head to the RIGHT, so the body runs head → shoulder → hip →
 * knee → foot from right to left and the torso angle is positive. The feet must
 * therefore sit well to the *left* of the hip; putting them on the head's side
 * folds the legs back over the torso into an unreadable knot.
 *
 * Knees bend toward the ceiling (`legBend: [1, 1]`), and the shoulders, hands
 * and feet stay planted through the whole movement — only the hip travels,
 * which is the exercise.
 */
const HAND: [number, number] = [145, 170];
const FOOT: [number, number] = [120, 170];

/**
 * Frog pump: heels drawn in close to the hips instead of the standard bridge's
 * far-out foot. Splay doesn't read side-on, so the tell is the shorter
 * hip-to-heel distance (22.4 here vs 33.5 for the standard bridge's down
 * keyframe) and a shallower lift (torso to 13° instead of 24°). Knee closes to
 * 42.3/46.4 at the bottom — tight, but clear of the 25° floor; that tightness
 * is the point, since heels-to-hips is maximum knee flexion by definition.
 */
const FROG_FOOT: [number, number] = [132, 170];
const FROG_DOWN: RigPose = {
  hip: [152, 158],
  torsoAngle: 0,
  headTilt: 0,
  handR: HAND,
  handL: HAND,
  footR: FROG_FOOT,
  footL: FROG_FOOT,
  armBend: [-1, -1],
  legBend: [1, 1],
};
const FROG_UP: RigPose = {
  hip: [152, 148],
  torsoAngle: 13,
  headTilt: -14,
  handR: HAND,
  handL: HAND,
  footR: FROG_FOOT,
  footL: FROG_FOOT,
  armBend: [-1, -1],
  legBend: [1, 1],
};

/**
 * Glute bridge march: hip and torso are identical in both keyframes — the
 * whole point is that the lifted hip does not drop — and only footR moves,
 * from planted to raised toward the chest. footR's raised target (135, 110)
 * was chosen after checking the swept path, not just the endpoints: a nearer
 * target like (144, 120) reads fine at the keyframe (knee 43.5°) but the
 * straight-line interpolation toward it clips knee down to 29.8° mid-rep.
 * (135, 110) keeps the worst point of the sweep at 44.6°.
 */
const MARCH_RAISED: [number, number] = [135, 110];

const DOWN: RigPose = {
  hip: [152, 158],
  torsoAngle: 0,
  headTilt: 0,
  handR: HAND,
  handL: HAND,
  footR: FOOT,
  footL: FOOT,
  armBend: [-1, -1],
  legBend: [1, 1],
};
const UP: RigPose = {
  hip: [152, 140],
  torsoAngle: 24,
  headTilt: -26,
  handR: HAND,
  handL: HAND,
  footR: FOOT,
  footL: FOOT,
  armBend: [-1, -1],
  legBend: [1, 1],
};

export const bridge: RigPattern = {
  id: 'bridge',
  cycleMs: 2400,
  load: 'thigh',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'leg',
  keyframes: [DOWN, UP],
  // Elevated glute bridge. Without this, `elevate: 'feet'` parsed, resolved and
  // did nothing, and the exercise drew pixel-identical to a plain glute bridge
  // — the audit's fourth finding. The shoulders stay planted and the hip is
  // re-solved from the raised heels, which deepens the lift rather than sliding
  // the whole figure up: measured, the top keyframe's hip goes from (152, 140)
  // to (160.6, 127.4) and the torso from 24° to 44.9°, while the bottom barely
  // moves — which is the exercise. It is applied to whichever frames are showing,
  // so it composes with `frog` and `march` rather than replacing them.
  derive: ({ footRise, frames }) => frames.map((f) => raiseFootContact(f, footRise)),
  poses: {
    frog: [FROG_DOWN, FROG_UP],
    // Both keyframes share UP's hip and torso — footL stays planted and only
    // footR lifts, so the trunk genuinely never drops.
    march: [UP, { ...UP, footR: MARCH_RAISED }],
  },
};
