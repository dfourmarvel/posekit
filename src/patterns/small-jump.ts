import type { RigPattern, RigPose } from '../types';

/**
 * Carries 3 exercises: pogo hops, jump rope, fast feet.
 *
 * Small repeated hops off the balls of the feet. The airborne frame lifts the
 * ankles clear of the floor with the legs extended; `toe: 'tucked'` points the
 * toes down as they leave the ground, which is what sells it as a hop rather
 * than a bob.
 */
const GROUND: RigPose = {
  hip: [160, 108],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 112],
  handL: [168, 114],
  footR: [164, 170],
  footL: [155, 170],
  armBend: [1, 1],
  legBend: [-1, -1],
};
const AIR: RigPose = {
  hip: [160, 98],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 102],
  handL: [168, 104],
  footR: [164, 162],
  footL: [155, 162],
  armBend: [1, 1],
  legBend: [-1, -1],
};

/**
 * Jump rope: same small ground/air hop as the base pattern, but the elbows
 * tuck in at the sides (joint 22-24px below the shoulder, at x = 158.7
 * against a shoulder at 161.5
 * against a shoulder at 161.5 — i.e. almost directly under it) with the hands
 * out in front turning a rope. Elbow 92.7°/99.7° at both keyframes, well past
 * the 28° floor.
 */
const ROPE_GROUND: RigPose = { ...GROUND, handR: [180, 95], handL: [176, 97] };
const ROPE_AIR: RigPose = { ...AIR, handR: [180, 85], handL: [176, 87] };

/**
 * Fast feet: rapid alternating feet rather than both leaving the floor
 * together, so footR and footL genuinely differ instead of tracking one
 * another. Hip held constant at y=106 across both keyframes — this is a
 * shuffle, not a hop, so the trunk doesn't bob. One foot stays grounded at the
 * standing target while the other lifts to (158, 155); knee on the lifted leg
 * is 104.6° (comfortably past 25°), hip angle 174.4°/179.7° on both.
 */
const FAST_LIFTED: [number, number] = [158, 155];

export const smallJump: RigPattern = {
  id: 'small_jump',
  cycleMs: 700,
  load: 'shin',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: [GROUND, AIR],
  poses: {
    pogo: [GROUND, AIR],
    rope: [ROPE_GROUND, ROPE_AIR],
    fastFeet: [
      { ...GROUND, hip: [160, 106], footL: FAST_LIFTED },
      { ...GROUND, hip: [160, 106], footR: FAST_LIFTED },
    ],
  },
};
