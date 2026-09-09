import type { RigPattern } from '../types';

/**
 * Carries 3 exercises: farmer's carry, suitcase carry, plate pinch.
 *
 * A loaded walk. The two keyframes swap which foot is forward, so the figure
 * strides rather than bobbing on the spot, and the arms stay straight down
 * because that is what carrying something heavy looks like.
 */
export const carry: RigPattern = {
  id: 'carry',
  cycleMs: 1600,
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
      handR: [170, 112],
      handL: [166, 114],
      footR: [170, 170],
      footL: [150, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [160, 106],
      torsoAngle: -89,
      headTilt: -2,
      handR: [170, 110],
      handL: [166, 112],
      footR: [150, 170],
      footL: [170, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
