import type { RigPattern } from '../types';

/**
 * Front raise — standing, straight arms lifting the weight forward and up to
 * shoulder height. Mis-mapped onto `lateral_raise` today, which is
 * `view: 'front'`; a front raise seen front-on comes straight at the camera
 * and shows nothing. Side-on it is a clean arc from the thigh to shoulder
 * height, so this is its own side-view pattern.
 *
 * The arc is ~80° of sweep, close to `lateral_raise`'s 81°, and the same fix
 * applies: a straight-line hand path between two 80°-apart poses cuts a chord
 * that folds the elbow well past its real minimum mid-rep. Four keyframes
 * keep every step under ~27° and the hand within the arm's own 46-unit reach
 * the whole way, so the arm reads as straight throughout instead of buckling
 * and recovering twice a rep.
 */
export const frontRaise: RigPattern = {
  id: 'front_raise',
  cycleMs: 2400,
  load: 'upperArm',
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
      handR: [190.55, 102.03],
      handL: [186.55, 104.03],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [203.73, 86.17],
      handL: [199.73, 88.17],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [208.46, 66.1],
      handL: [204.46, 68.1],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
