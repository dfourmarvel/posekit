import type { RigPattern } from '../types';

/**
 * Carries the backpack fly.
 *
 * A fly opens in the frontal plane, which a side view cannot show, so what it
 * depicts is the part that IS visible side-on: the arms travelling from stacked
 * over the chest out and down toward the floor.
 */
const FOOT: [number, number] = [120, 170];

export const supineFly: RigPattern = {
  id: 'supine_fly',
  cycleMs: 2600,
  load: 'upperArm',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [196, 118], handL: [196, 118],
      footR: FOOT, footL: FOOT,
      armBend: [-1, -1], legBend: [1, 1],
    },
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [206, 146], handL: [206, 146],
      footR: FOOT, footL: FOOT,
      armBend: [-1, -1], legBend: [1, 1],
    },
  ],
};
