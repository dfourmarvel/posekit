import type { RigPattern, RigPose } from '../types';

/**
 * Carries 5 exercises: Romanian deadlift, single-leg RDL, good morning,
 * backpack deadlift, clean and press.
 *
 * A hinge, not a squat: the hips travel backwards and the torso pitches over
 * them while the knees stay soft. The arms hang straight down from the shoulder
 * throughout, which is what the clamped IK gives when the hand target sits
 * further than the arm can reach.
 */
/** Standing tall, hands hanging at the side. Shared by every keyframe set below. */
const STANDING: RigPose = {
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

/**
 * Deep hinge, hands at the floor (backpack deadlift).
 *
 * Measured from the near arm's actual root (191.16, 123.42): the hand at
 * (185, 166) is 43.0 from it, under the 46.0 max, so this is a genuine
 * unclamped floor contact, not the clamped straight-arm hang the standing and
 * mid-shin keyframes use. Knee 76.8/81.1, hip angle 84.3/97.0 — both well
 * clear of their 25/35 floors. Torso pitches to -14.5 (mid-shin's RDL bottom
 * only goes to -40) and hip drops to (150, 132), which is what lets the
 * shoulder get low enough to reach without the arm floating off the ground.
 */
const FLOOR_BOTTOM: RigPose = {
  hip: [150, 132],
  torsoAngle: -14.5,
  headTilt: 14,
  handR: [185, 166],
  handL: [183, 165],
  footR: [164, 170],
  footL: [155, 170],
  armBend: [1, 1],
  legBend: [-1, -1],
};

/**
 * Clean catch: standing tall but with the hands already brought in front of
 * the shoulders (elbow 47.9/51.0) rather than hanging at the side. Going
 * straight from the side-hang standing pose to overhead swings the hand
 * through an arc that passes the shoulder and folds the elbow to 18.5° mid-rep
 * — below the 28° floor — so this sits between floor and overhead instead.
 */
const RACK: RigPose = {
  hip: [160, 108],
  torsoAngle: -88,
  headTilt: -2,
  handR: [180, 75],
  handL: [176, 77],
  footR: [164, 170],
  footL: [155, 170],
  armBend: [1, 1],
  legBend: [-1, -1],
};

/**
 * Locked out overhead. Worst elbow across the full floor→rack→overhead sweep
 * is 46.1° (sampled every 1/32 of the cycle), comfortably clear of 28°. Kept
 * short of a dead-straight overhead reach on purpose: pushing the hand
 * further up is what put a `range: 'full'` sample 1.5px outside the top
 * bounds edge during authoring.
 */
const OVERHEAD: RigPose = {
  hip: [160, 108],
  torsoAngle: -88,
  headTilt: -2,
  handR: [188, 33],
  handL: [184, 35],
  footR: [164, 170],
  footL: [155, 170],
  armBend: [1, 1],
  legBend: [-1, -1],
};

export const hinge: RigPattern = {
  id: 'hinge',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'leg',
  keyframes: [
    STANDING,
    {
      hip: [148, 116],
      torsoAngle: -40,
      headTilt: 10,
      handR: [180, 140],
      handL: [176, 142],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
  poses: {
    floor: [STANDING, FLOOR_BOTTOM],
    floorPress: [FLOOR_BOTTOM, RACK, OVERHEAD],
  },
};
