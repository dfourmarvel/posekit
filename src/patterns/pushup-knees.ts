import type { RigPattern } from '../types';

/**
 * Knee push-up — its own pattern rather than a `knees: true` flag on the full
 * push-up, for the reason SPEC-07 §6.2 gives: the flag changes the kinematic
 * chain (the knee becomes the ground contact, not the toe), so no offset
 * expresses it, and the exercise rendered as a full push-up under the wrong name.
 *
 * The knee is the pivot and never moves. Both keyframes place the hip exactly 31
 * (one thigh) from [130, 168] and the ankle exactly 31 back from that same
 * point, so the IK reproduces the floor contact rather than approximating it —
 * no hip is placed by eye. The body line is steeper than a full push-up's
 * because knee-to-shoulder spans 73 units against the 104 of a toe-to-shoulder
 * line; that steepness is the exercise.
 *
 * The top body angle is 37.5° rather than a rounder number because that is what
 * puts the shoulder 45.4 from the *offset* arm root and so locks the elbow out
 * at 161°. Solving it against the centre shoulder instead costs 17° of lockout
 * (§4.6) and leaves the top of the rep looking like a half-press.
 */
export const pushupKnees: RigPattern = {
  id: 'pushup_knees',
  cycleMs: 2200,
  load: 'upperArm',
  // Shins point up and back off the floor, so the foot segment trails behind.
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'arm',
  keyframes: [
    {
      hip: [154.59, 149.13],
      torsoAngle: -37.5,
      headTilt: 10,
      handR: [196, 170],
      handL: [196, 170],
      footR: [114.5, 141.15],
      footL: [114.5, 141.15],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [157.86, 154.41],
      torsoAngle: -26,
      headTilt: 14,
      handR: [196, 170],
      handL: [196, 170],
      footR: [114.5, 141.15],
      footL: [114.5, 141.15],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
