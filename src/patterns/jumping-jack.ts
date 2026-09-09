import type { RigPattern } from '../types';

/**
 * Front view: both limb pairs draw at full opacity, the figure shows two eyes,
 * and every pose is symmetric about x = 160.
 *
 * Five keyframes, not three. All three original poses already sat ~45 from the
 * shoulder — the arm's near-full span — but they were 71° and 75° apart around
 * it, and the hand interpolates in a straight line. That chord passes 34 from
 * the shoulder, folding the elbow to 102° halfway between two poses where it is
 * 158° and 159°: the arm visibly collapses and recovers, twice per rep. The
 * inserted frames halve each sweep so no chord cuts deeper than 43.
 *
 * The hips sit *lower* in the open position than the closed one: a jumping jack
 * lands with a wider stance and softer knees, so the hips must drop. The middle
 * pose is airborne — without that the legs read as sliding apart rather than
 * jumping, which is the whole movement.
 */
export const jumpingJack: RigPattern = {
  id: 'jumping_jack',
  cycleMs: 900,
  load: 'none',
  footDir: 1,
  view: 'front',
  loop: 'pingpong',
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
      hip: [160, 104],
      torsoAngle: -90,
      headTilt: 0,
      handR: [198.5, 94.2],
      handL: [121.5, 94.2],
      footR: [171, 164],
      footL: [149, 164],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      // Airborne, arms level with the shoulders.
      hip: [160, 100],
      torsoAngle: -90,
      headTilt: 0,
      handR: [212, 66],
      handL: [108, 66],
      footR: [176, 158],
      footL: [144, 158],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [207, 45.4],
      handL: [113, 45.4],
      footR: [183, 164],
      footL: [137, 164],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 116],
      torsoAngle: -90,
      headTilt: 0,
      handR: [186, 34],
      handL: [134, 34],
      footR: [190, 170],
      footL: [130, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
  ],
};
