import type { RigPose, RigPattern } from '../types';

/**
 * Two quiet hold frames. The drift follows the shoulder-to-hip axis rather than
 * falling vertically, so the standing figure breathes without changing pose.
 */
function hold(pose: RigPose): RigPose[] {
  // Torso angle only. Translating the hip on a standing figure shortens the
  // distance to a planted foot, so the knees fold to 148° on what is supposed
  // to be a still hold.
  return [pose, { ...pose, torsoAngle: pose.torsoAngle - 1.2 }];
}

/**
 * Standing stretch library. Each named entry is a static hold selected by the
 * exercise's `rig_params.pose`; the base keyframes are a safe neutral fallback.
 */
export const stretchStanding: RigPattern = {
  id: 'stretch_standing',
  cycleMs: 3400,
  load: 'none',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  keyframes: hold({
    hip: [160, 108],
    torsoAngle: -88,
    headTilt: -2,
    handR: [181, 105],
    handL: [177, 107],
    footR: [164, 170],
    footL: [155, 170],
    armBend: [1, 1],
    legBend: [-1, -1],
  }),
  poses: {
    neckFlex: hold({
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: 32,
      handR: [181, 105],
      handL: [177, 107],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    neckExt: hold({
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -30,
      handR: [181, 105],
      handL: [177, 107],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    neckSide: hold({
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: 18,
      handR: [175, 48],
      handL: [171, 50],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    doorway: hold({
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [205, 62],
      handL: [201, 64],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    crossBody: hold({
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [144, 78],
      handL: [148, 80],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    quad: hold({
      hip: [160, 108],
      torsoAngle: -105,
      headTilt: -2,
      handR: [145, 122],
      handL: [143, 124],
      footR: [145, 122],
      footL: [155, 170],
      armBend: [-1, -1],
      legBend: [-1, -1],
    }),
    hamstring: hold({
      hip: [157, 112],
      torsoAngle: -55,
      headTilt: -4,
      handR: [198, 120],
      handL: [194, 122],
      footR: [205, 138],
      footL: [151, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    calf: hold({
      hip: [140, 135],
      torsoAngle: -55,
      headTilt: -4,
      handR: [200, 100],
      handL: [196, 102],
      footR: [175, 170],
      footL: [90, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
    groin: hold({
      hip: [160, 130],
      torsoAngle: -90,
      headTilt: 0,
      handR: [190, 120],
      handL: [186, 122],
      footR: [208, 170],
      footL: [112, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    }),
  },
};
