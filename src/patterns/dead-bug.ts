import type { RigPattern } from '../types';

/**
 * Carries the dead bug.
 *
 * The one pattern so far where the two sides genuinely differ: the near arm and
 * far leg extend together while the others hold tabletop, which is the whole
 * point of the exercise. Contact targets are per-limb, so this needs no special
 * support.
 */
export const deadBug: RigPattern = {
  id: 'dead_bug',
  cycleMs: 2600,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [206, 128], handL: [206, 128],
      footR: [132, 132], footL: [132, 132],
      armBend: [-1, -1], legBend: [1, 1],
    },
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [222, 152], handL: [206, 128],
      footR: [132, 132], footL: [108, 164],
      armBend: [-1, -1], legBend: [1, 1],
    },
  ],
};
