import type { RigPattern } from '../types';

/**
 * Carries 5 exercises: bicep, hammer, reverse, towel and isometric curls.
 * The concentration curl left for `seated_curl` — it sits down, and no offset
 * turns a standing chain into a seated one.
 *
 * plus the isometric hold.
 *
 * Both arms curl forward together — this is a side view, so mirroring the far
 * arm would fling its elbow out behind the figure. The elbow stays low and close
 * to the ribs, which is the form cue the exercise lives or dies on.
 */
export const curl: RigPattern = {
  id: 'curl',
  cycleMs: 2200,
  load: 'foreArm',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'arm',
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
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [184, 84],
      handL: [180, 86],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
