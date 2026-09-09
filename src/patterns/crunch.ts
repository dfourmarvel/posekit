import type { RigPattern, RigPose, Vec2 } from '../types';

/**
 * Carries 8 exercises: crunch, sit-up, V-up, bicycle, hollow holds and rocks.
 *
 * Supine with the head to the RIGHT, so the feet sit to the left of the hip and
 * the knees bend toward the ceiling. Only the torso travels: the hip stays put
 * and the shoulders curl up off the floor, which is the movement.
 */
const FOOT: [number, number] = [120, 170];
const HIP: Vec2 = [152, 158];

/** Base pose builder: hip fixed, only torso/hands/feet vary per named pose. */
function pose(o: {
  torsoAngle: number;
  headTilt: number;
  hand: Vec2;
  footR: Vec2;
  footL?: Vec2;
}): RigPose {
  return {
    hip: HIP,
    torsoAngle: o.torsoAngle,
    headTilt: o.headTilt,
    handR: o.hand,
    handL: o.hand,
    footR: o.footR,
    footL: o.footL ?? o.footR,
    armBend: [-1, -1],
    legBend: [1, 1],
  };
}

// Legs stay vertical (near-straight reach off the hip) throughout; only the
// torso curls. Curl is capped near -50° — past that the hip-fold invariant
// (leg must not read as folded back alongside the torso) drops below 35°.
const FEET_UP: Vec2 = [152, 99];
const LEGS_UP: RigPose[] = [
  pose({ torsoAngle: -8, headTilt: 0, hand: [178, 150], footR: FEET_UP }),
  pose({ torsoAngle: -50, headTilt: 8, hand: [160, 112], footR: FEET_UP }),
];

// Torso and legs rise together from flat to a shared peak — the "V". Torso
// swings up-right toward the head side, legs up-left, so the two never
// converge into the fold-back the hip-angle invariant guards against.
const VUP_LOW: Vec2 = [122, 168];
const VUP_HIGH: Vec2 = [125, 111];
const VUP: RigPose[] = [
  pose({ torsoAngle: 0, headTilt: 0, hand: [176, 150], footR: VUP_LOW }),
  pose({ torsoAngle: -60, headTilt: 10, hand: [148, 125], footR: VUP_HIGH }),
];

// Same torso sweep as the V-up, but only footR reaches the peak — footL stays
// at the low target throughout, which is the jackknife's one-leg-at-a-time.
const ALTERNATE_VUP: RigPose[] = [
  pose({ torsoAngle: 0, headTilt: 0, hand: [176, 150], footR: VUP_LOW, footL: VUP_LOW }),
  pose({ torsoAngle: -60, headTilt: 10, hand: [148, 125], footR: VUP_HIGH, footL: VUP_LOW }),
];

// Torso curl and hands are fixed across both frames — bicycle keeps the torso
// up the whole time. Only the feet swap between a tucked knee and an extended
// leg, which is the alternating pump; the two keyframes are its two ends.
const TUCKED: Vec2 = [142, 128];
const EXTENDED: Vec2 = [108, 163];
const BICYCLE: RigPose[] = [
  pose({ torsoAngle: -35, headTilt: 8, hand: [205, 120], footR: TUCKED, footL: EXTENDED }),
  pose({ torsoAngle: -35, headTilt: 8, hand: [205, 120], footR: EXTENDED, footL: TUCKED }),
];

// Static hold: torso curled, legs raised straight and just off the floor.
// The second keyframe is the SPEC-07 breathing drift — hip moved ~1.5 units
// along the torso axis, torsoAngle nudged 1° — never a straight vertical shift.
// Lowered from y=139 to keep the figure's crop box reaching the ground line
// (bounds.test.ts) now that the raised foot no longer does — the arm still
// reads as reaching back past the head, just closer to hip height.
const HOLLOW_HAND: Vec2 = [223, 158];
// Reach 57.7 of the 62-unit leg span, well clear of the floor (28 units) —
// a bent-knee target (44.7 reach) let the IK clamp resolve a right-angle knee
// and drop the foot to a 6-unit clearance, which reads as bent knees on the
// floor rather than the raised legs a hollow hold depends on.
//
// Not fully straight: 57.7 of 62 leaves the knee at 142.6°, so about 37° of
// bend. Asking the full 62 would clamp, which is the fault this replaced. A
// dish this shallow is the honest limit of one shared contact target per pair.
const HOLLOW_FOOT: Vec2 = [96, 144];
const hollowBase = pose({ torsoAngle: -15, headTilt: 5, hand: HOLLOW_HAND, footR: HOLLOW_FOOT });
function breathe(p: RigPose): RigPose {
  const t = (p.torsoAngle * Math.PI) / 180;
  return {
    ...p,
    hip: [p.hip[0] + Math.cos(t) * 1.5, p.hip[1] + Math.sin(t) * 1.5],
    torsoAngle: p.torsoAngle - 1,
  };
}
const HOLLOW: RigPose[] = [hollowBase, breathe(hollowBase)];

// Same hollow shape, rocked: hand and foot targets are rotated as vectors off
// the hip by equal and opposite angles, and torsoAngle shifts by the same
// amount — a rigid rotation about the hip, so the torso/leg shape (and every
// joint angle it produces) is unchanged, only its tilt.
function rotate(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}
function rocked(deltaDeg: number): RigPose {
  const handVec: Vec2 = [HOLLOW_HAND[0] - HIP[0], HOLLOW_HAND[1] - HIP[1]];
  const footVec: Vec2 = [HOLLOW_FOOT[0] - HIP[0], HOLLOW_FOOT[1] - HIP[1]];
  const hv = rotate(handVec, deltaDeg);
  const fv = rotate(footVec, deltaDeg);
  const hand: Vec2 = [HIP[0] + hv[0], HIP[1] + hv[1]];
  const foot: Vec2 = [HIP[0] + fv[0], HIP[1] + fv[1]];
  return pose({ torsoAngle: -15 + deltaDeg, headTilt: 5, hand, footR: foot });
}
const HOLLOW_ROCK: RigPose[] = [rocked(-6), rocked(6)];

export const crunch: RigPattern = {
  id: 'crunch',
  cycleMs: 2200,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [
    {
      hip: [152, 158],
      torsoAngle: 0,
      headTilt: 0,
      handR: [200, 140],
      handL: [200, 140],
      footR: FOOT,
      footL: FOOT,
      armBend: [-1, -1],
      legBend: [1, 1],
    },
    {
      hip: [152, 158],
      torsoAngle: -25,
      headTilt: 10,
      handR: [196, 122],
      handL: [196, 122],
      footR: FOOT,
      footL: FOOT,
      armBend: [-1, -1],
      legBend: [1, 1],
    },
  ],
  poses: {
    legsUp: LEGS_UP,
    vup: VUP,
    alternateVup: ALTERNATE_VUP,
    bicycle: BICYCLE,
    hollow: HOLLOW,
    hollowRock: HOLLOW_ROCK,
  },
};
