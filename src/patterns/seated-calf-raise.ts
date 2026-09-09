import type { RigPattern } from '../types';

/**
 * Carries the seated calf raise. `seated` changes the kinematic chain — the
 * thigh runs forward from the hip instead of bearing weight below it — and no
 * offset on `calf_raise` can express that, so it gets its own base pose
 * (SPEC-07 D3). Unlike the standing version, the hip never rises: only the
 * foot target lifts, so the thigh stays close to horizontal throughout and the
 * heel-and-toe pivot reads at the ankle, not the hip. `toe: 'tucked'` is what
 * draws that pivot, and it needs the ankle strictly above the floor even at
 * rest — an ankle sitting exactly on the ground line gives a zero-length drop,
 * so the toe lands level with the ankle instead of angled below it, which is
 * indistinguishable from a broken tucked foot. The rest ankle sits 2 units up
 * for the same reason `calf_raise` does.
 */
export const seatedCalfRaise: RigPattern = {
  id: 'seated_calf_raise',
  cycleMs: 1800,
  load: 'shin',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  props: [{ x: 127, y: 145, w: 46, h: 27 }],
  keyframes: [
    {
      hip: [150, 141],
      torsoAngle: -90,
      headTilt: 0,
      handR: [168, 138],
      handL: [157, 135],
      footR: [181, 170],
      footL: [174, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [150, 141],
      torsoAngle: -90,
      headTilt: 0,
      handR: [168, 138],
      handL: [157, 135],
      footR: [181, 162],
      footL: [174, 162],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
};
