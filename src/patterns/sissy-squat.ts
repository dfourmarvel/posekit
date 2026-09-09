import type { RigPattern } from '../types';

/**
 * Carries the sissy squat. It cannot live as a named pose on `squat` because it
 * needs `toe: 'tucked'` — the whole rep is done on the balls of the feet — and
 * `toe` is a pattern-level field, not something a pose can set for itself.
 *
 * The feet stay planted at a single contact throughout: the hips drop straight
 * down and the torso reclines rather than hinging back, which is what separates
 * this from a normal squat's hip-driven descent. Both keyframes share one hand
 * target — the shoulder moves toward a fixed hand rather than the hand chasing
 * a moving shoulder, which keeps the elbow from sweeping through the torso.
 */
export const sissySquat: RigPattern = {
  id: 'sissy_squat',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: [
    {
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [172, 112],
      handL: [168, 114],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [158, 130],
      torsoAngle: -105,
      headTilt: -2,
      handR: [172, 112],
      handL: [168, 114],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
