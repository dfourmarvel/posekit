import type { RigPattern, RigPose } from '../types';

/**
 * Carries 4 exercises: standing, single-leg and stair calf raises, and
 * the isometric hold.
 *
 * The whole body rises as the heel lifts; the ankle travels with it while the
 * toe stays planted. `toe: 'tucked'` is what keeps the toe on the floor as the
 * ankle climbs, which is the entire visual of the movement.
 */
const UP: RigPose = {
  hip: [160, 100],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 104],
  handL: [168, 106],
  footR: [164, 162],
  footL: [155, 162],
  armBend: [1, 1],
  legBend: [-1, -1],
};

/**
 * Stair calf raise: the forefoot is on a step, so the heel travels further than
 * it can on flat ground.
 *
 * **This one is close to inexpressible, and the margin should be understood
 * before anyone trusts it.** The step cannot be drawn: `props` is a pattern-level
 * field, so one here would appear under every calf-raise variant. The heel cannot
 * drop below the floor either. And the rise is capped too — the foot is 11 units
 * long and its tip is pinned to the ground line, so an ankle above y = 161 lifts
 * the toe clear and the figure floats.
 *
 * That leaves 171 → 161, an ankle travel of 10 against the base pattern's 8. Two
 * units. It is enough to stop the two exercises rendering pixel-identical and it
 * is not enough to see at a 56px thumbnail. Treat `ledge` as pile (b) in
 * practice: the difference exists in the numbers and not really on screen.
 *
 * The knee stays out of it, which is the point of a calf raise. An earlier
 * version put the hip at 112 against an ankle at 163 — 51 apart on a 62-unit leg
 * — which forced the knee to 110.6°, and then described that as "near-straight".
 * It is 69.4° of flexion and rendered as a visible knee dip. Hip and ankle now
 * stay 62 apart in both frames, so the leg reads straight throughout: measured
 * knee 176.0° at both ends.
 */
const LEDGE_DOWN: RigPose = {
  hip: [160, 109],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 113],
  handL: [168, 115],
  footR: [164, 171],
  footL: [155, 171],
  armBend: [1, 1],
  legBend: [-1, -1],
};
const LEDGE_UP: RigPose = {
  hip: [160, 99],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 103],
  handL: [168, 105],
  footR: [164, 161],
  footL: [155, 161],
  armBend: [1, 1],
  legBend: [-1, -1],
};

export const calfRaise: RigPattern = {
  id: 'calf_raise',
  cycleMs: 1800,
  load: 'shin',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  unilateral: 'leg',
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
    UP,
  ],
  poses: {
    ledge: [LEDGE_DOWN, LEDGE_UP],
  },
};
