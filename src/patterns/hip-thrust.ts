import type { RigPattern, RigPose, Vec2 } from '../types';
import { RIG } from '../solve';

/**
 * Hip thrust — upper back on a couch edge, feet on the floor, hips driving up.
 *
 * It gets its own pattern rather than a param on `bridge` for the reason SPEC-07
 * §6.2 gives: `elevate: 'shoulders'` is a change of kinematic chain, not an
 * offset. The whole point of the movement is that the shoulder, not the upper
 * back, is the fixed point the body pivots around, and no rise applied to
 * `bridge` produces that. Until this existed the exercise drew pixel-identical
 * to a plain glute bridge, which is precisely what §6.2 forbids.
 *
 * The shoulder is the pinned contact, so the hip is *derived* from it: at torso
 * angle `t` the hip is one torso length back along that angle. Nothing here is
 * placed by eye. What the two keyframes author is one number each — how far the
 * trunk has rotated about the shoulder.
 */
const SHOULDER: Vec2 = [190, 136];
/**
 * Braced on the floor beside the hips, and placed for reach rather than by eye:
 * the shoulder sits only 34 above the floor, so a hand planted under it leaves a
 * 46-unit arm folding 20 units out at the elbow. At 43.9 from the arm root the
 * elbow bows 6.9 and the arm reads as a straight brace. Well clear of the
 * couch's left edge, so the hand never disappears into the furniture.
 */
const HAND: Vec2 = [160, 170];
/** Planted, and far enough left that the top of the rep stands the shin upright. */
const FOOT: Vec2 = [117, 170];
/** Head direction in absolute degrees: level, resting back on the cushion. */
const HEAD_DIR = 0;

function fromTorsoAngle(torsoAngle: number): RigPose {
  const t = (torsoAngle * Math.PI) / 180;
  return {
    hip: [SHOULDER[0] - Math.cos(t) * RIG.torso, SHOULDER[1] - Math.sin(t) * RIG.torso],
    torsoAngle,
    // The head rests on the couch throughout, so it holds an absolute direction
    // rather than a tilt relative to a trunk that is rotating underneath it.
    headTilt: HEAD_DIR - torsoAngle,
    handR: HAND,
    handL: HAND,
    footR: FOOT,
    footL: FOOT,
    armBend: [1, 1],
    // Knees toward the ceiling, as on `bridge`. The -1 that looks equally
    // plausible drops the knee to the floor and stands the shin back up
    // underneath it, which is not a shape a loaded hip can make.
    legBend: [1, 1],
  };
}

/** Hips down, pelvis just off the floor at (153.6, 157); knee closes to 78°. */
const DOWN = fromTorsoAngle(-30);
/** Lockout: trunk level with the couch, thigh horizontal, shin vertical, knee 96°. */
const UP = fromTorsoAngle(0);

export const hipThrust: RigPattern = {
  id: 'hip_thrust',
  cycleMs: 2400,
  load: 'thigh',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'leg',
  // Furniture-bound in every frame, which is the one case the pattern-level
  // `props` field serves cleanly (SPEC-07 param audit, "Props are pattern-level").
  // Its top edge sits at 146, so the trunk's 19-wide stroke rests on it.
  props: [{ x: 184, y: 146, w: 50, h: 26 }],
  keyframes: [DOWN, UP],
};
