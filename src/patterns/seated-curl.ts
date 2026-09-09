import type { RigPattern } from '../types';

/**
 * Carries the concentration curl. `seated` changes the kinematic chain — the
 * thigh runs forward from the hip instead of hanging below it — and no offset
 * on `curl` can express that, so it gets its own base pose (SPEC-07 D3).
 *
 * The near arm is the only one that moves. The far one is held still through the
 * rep, hanging beside the thigh rather than braced on the knee — its hand sits
 * at (157, 135) against a far knee at (179, 141), 22.9 apart, because bringing
 * it to the knee would fold that elbow past what the contract allows.
 *
 * The bottom target is a near-max reach toward the inner knee. The upper arm
 * (24) is shorter than the hip-to-thigh drop (42), so the elbow can get close to
 * the thigh but never rests on it; this is as low as the geometry allows.
 *
 * `unilateral: 'arm'` is declared but currently inert: it only takes effect for
 * a row setting `single`, and the concentration curl does not. It is there so
 * the pattern behaves if one ever does.
 *
 * The chair prop is what reads the pose as seated rather than kneeling.
 */
export const seatedCurl: RigPattern = {
  id: 'seated_curl',
  cycleMs: 2200,
  load: 'foreArm',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'arm',
  props: [{ x: 127, y: 145, w: 46, h: 27 }],
  keyframes: [
    {
      hip: [150, 141],
      torsoAngle: -90,
      headTilt: 0,
      handR: [160.5, 144.93],
      handL: [157, 135],
      footR: [181, 172],
      footL: [174, 172],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [150, 141],
      torsoAngle: -90,
      headTilt: 0,
      handR: [172.5, 116.93],
      handL: [157, 135],
      footR: [181, 172],
      footL: [174, 172],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
