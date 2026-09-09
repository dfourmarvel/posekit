import type { RigPattern, RigPose, Vec2 } from '../types';

type PoseOptions = {
  hip: Vec2;
  torsoAngle: number;
  headTilt?: number;
  handR: Vec2;
  handL?: Vec2;
  footR: Vec2;
  footL?: Vec2;
  armBend?: readonly [number, number];
  legBend?: readonly [number, number];
};

/**
 * A floor stretch only authors the pelvis root and contact targets. Elbows and
 * knees remain derived by the rig's two-bone IK solver; no anatomical joints
 * are placed in this library.
 */
function pose({
  hip,
  torsoAngle,
  headTilt = 0,
  handR,
  handL = handR,
  footR,
  footL = footR,
  armBend = [1, 1],
  legBend = [1, 1],
}: PoseOptions): RigPose {
  return { hip, torsoAngle, headTilt, handR, handL, footR, footL, armBend, legBend };
}

/** A safe, barely perceptible drift along the torso axis for static holds. */
function breathe(base: RigPose): RigPose {
  const radians = (base.torsoAngle * Math.PI) / 180;
  return {
    ...base,
    hip: [base.hip[0] + Math.cos(radians) * 1.25, base.hip[1] + Math.sin(radians) * 1.25],
    torsoAngle: base.torsoAngle - 1.25,
    headTilt: base.headTilt + 1.25,
  };
}

const quadruped = pose({
  hip: [143, 130],
  torsoAngle: 0,
  headTilt: 4,
  handR: [207, 168],
  footR: [96, 168],
  armBend: [1, 1],
  legBend: [1, 1],
});

const catCow: RigPose[] = [
  pose({
    hip: [143, 130], torsoAngle: 7, headTilt: 14,
    handR: [207, 168], footR: [96, 168], armBend: [1, 1], legBend: [1, 1],
  }),
  pose({
    hip: [142, 132], torsoAngle: -7, headTilt: -9,
    handR: [207, 168], footR: [96, 168], armBend: [1, 1], legBend: [1, 1],
  }),
];

const child = pose({
  hip: [137, 145], torsoAngle: -12, headTilt: 18,
  handR: [207, 169], footR: [108, 166], armBend: [1, 1], legBend: [1, 1],
});

const cobra = pose({
  hip: [142, 158], torsoAngle: -34, headTilt: -16,
  handR: [201, 169], footR: [94, 165], armBend: [1, 1], legBend: [1, 1],
});

const sphinx = pose({
  hip: [143, 158], torsoAngle: -20, headTilt: 0,
  handR: [204, 169], footR: [96, 165], armBend: [1, 1], legBend: [1, 1],
});

const thread = pose({
  hip: [143, 130], torsoAngle: 2, headTilt: 18,
  handR: [207, 168], handL: [169, 165],
  footR: [96, 168], armBend: [1, 1], legBend: [1, 1],
});

const twist = pose({
  hip: [144, 143], torsoAngle: -90, headTilt: 12,
  handR: [113, 132], handL: [169, 121],
  footR: [106, 166], footL: [158, 164], armBend: [1, 1], legBend: [1, 1],
});

// Supine figures face right, so their feet deliberately remain left of the hip.
const figureFour = pose({
  hip: [150, 157], torsoAngle: 0, headTilt: 0,
  handR: [164, 140], handL: [158, 143],
  footR: [118, 167], footL: [140, 132], armBend: [-1, -1], legBend: [1, 1],
});

const pigeon = pose({
  hip: [145, 144], torsoAngle: -67, headTilt: 4,
  handR: [181, 157], handL: [174, 159],
  footR: [105, 166], footL: [170, 168], armBend: [1, 1], legBend: [1, 1],
});

const butterfly = pose({
  hip: [145, 143], torsoAngle: -90, headTilt: 0,
  handR: [137, 157], handL: [153, 157],
  footR: [129, 166], footL: [161, 166], armBend: [1, 1], legBend: [1, 1],
});

const frog = pose({
  hip: [143, 133], torsoAngle: 0, headTilt: 6,
  handR: [205, 168], footR: [97, 167], footL: [121, 169],
  armBend: [1, 1], legBend: [1, 1],
});

const ninetyNinety = pose({
  hip: [145, 143], torsoAngle: -90, headTilt: 2,
  handR: [111, 151], handL: [165, 151],
  footR: [106, 164], footL: [171, 164], armBend: [1, 1], legBend: [1, 1],
});

const hipFlexor = pose({
  hip: [150, 138], torsoAngle: -84, headTilt: 2,
  handR: [182, 148], handL: [175, 151],
  footR: [181, 169], footL: [105, 166], armBend: [1, 1], legBend: [1, 1],
});

/**
 * World's greatest stretch: a real range, not a breathing hold. Hip and both
 * feet stay put throughout — only the torso opens and the trailing arm
 * reaches up — so nothing here hand-places the hip, it's just never moved.
 *
 * The supporting hand stays on the floor; the trailing arm reaches up. The hip
 * and both feet never move.
 *
 * **How far the torso can open is set by the arm, not by the stretch.** The
 * torso pivots about a fixed hip, so opening it swings the shoulder up and away
 * from the planted hand. At the -42° this pose used to start from, the shoulder
 * sits 55.6 above the ground line against a 46-unit arm — the hand cannot reach
 * the floor at any x — and the earlier -70° finish put it at 71.5. The target was
 * left at [200, 169] regardless, so it clamped by 13.3, 22.0 and 31.1 and the
 * drawn hand floated 7.1, 15.0 then 22.6 above the floor: a supporting arm
 * ending in mid-air, rising as the stretch went on.
 *
 * The rotation is therefore -10° to -20°, which is what keeps the shoulder
 * within reach of the ground. Measured supporting-arm reach from its own root
 * stays under the 46-unit span at every frame, unclamped, with the hand tip on
 * the ground line throughout. Thoracic rotation is barely visible side-on anyway —
 * what reads as the movement is the trailing arm sweeping from the floor to
 * overhead, and that arm still over-reaches on purpose for the straight-arm
 * idiom.
 */
/** Only `torsoAngle`, `headTilt` and the reaching hand differ between these. */
const wgsAt = (torsoAngle: number, headTilt: number, handL: [number, number]) =>
  pose({
    hip: [147, 140], torsoAngle, headTilt,
    handR: [200, 169], handL,
    footR: [165, 169], footL: [106, 166], armBend: [1, 1], legBend: [1, 1],
  });

// Four frames, and the two middle ones exist only to route the reaching hand
// OUT to the side before it goes up. Straight from the floor to overhead, its
// path passes within a few units of its own shoulder and folds that elbow to
// 28.2° — a hair off the 28 floor, and a visible collapse-and-recover. Carried
// wide, the worst elbow across the whole cycle is 77.4°.
const wgsDown = wgsAt(-10, 8, [192, 169]);
const wgsOut = wgsAt(-13, 4, [214, 148]);
const wgsMid = wgsAt(-16, -4, [218, 110]);
const wgsUp = wgsAt(-20, -12, [198, 82]);

/**
 * The 13 floor stretches in the exercise library. Each named entry has two
 * frames: cat-cow uses its small spinal flexion/extension, and the remaining
 * holds use the same bounded breathing drift.
 */
export const stretchFloor: RigPattern = {
  id: 'stretch_floor',
  cycleMs: 3400,
  load: 'none',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [quadruped, breathe(quadruped)],
  poses: {
    catCow,
    child: [child, breathe(child)],
    cobra: [cobra, breathe(cobra)],
    sphinx: [sphinx, breathe(sphinx)],
    thread: [thread, breathe(thread)],
    twist: [twist, breathe(twist)],
    figureFour: [figureFour, breathe(figureFour)],
    pigeon: [pigeon, breathe(pigeon)],
    butterfly: [butterfly, breathe(butterfly)],
    frog: [frog, breathe(frog)],
    ninetyNinety: [ninetyNinety, breathe(ninetyNinety)],
    hipFlexor: [hipFlexor, breathe(hipFlexor)],
    wgs: [wgsDown, wgsOut, wgsMid, wgsUp],
  },
};
