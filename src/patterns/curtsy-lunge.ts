import type { RigPattern } from '../types';

/**
 * The rear foot (footL) crosses behind and past the midline to the far side —
 * it starts at x = 154, left of centre, and ends at x = 164, right of it —
 * while the front foot (footR) never moves. That crossing, not the knee
 * bend alone, is what a curtsy reads as from the front; a reverse lunge with
 * the same knee angles but the rear foot straight back would just look like a
 * narrow reverse lunge. `symmetry: 'free'` for the same reason as the other
 * two: the bottom pose is asymmetric by definition.
 *
 * The rear ankle/toe plants on the ground line — footL's y = 172 puts the
 * solved ankle (and so the tip) right at GROUND_Y, not floating above it —
 * and the rear knee is the thing that drops toward the floor without
 * touching it. `legBend[1] = 1` on that reach is what folds the knee down
 * rather than up toward the hip; the other sign lifts it instead and reads as
 * a raised knee, not a dropped one — checked both ways before picking this
 * one. Measured on the fix: rear ankle tip on GROUND_Y (0 off), rear knee
 * 9.2 units above the floor, knee angle 70.4°.
 */
export const curtsyLunge: RigPattern = {
  id: 'curtsy_lunge',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'front',
  loop: 'pingpong',
  unilateral: 'leg',
  symmetry: 'free',
  keyframes: [
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [174, 111],
      handL: [146, 111],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 138],
      torsoAngle: -90,
      headTilt: 0,
      handR: [174, 141],
      handL: [146, 141],
      footR: [166, 170],
      footL: [164, 172],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
  ],
};
