import type { RigPattern, RigPose } from '../types';

/**
 * Carries 9 exercises: bodyweight squat through loaded, jumping and single-leg
 * variants, plus three named poses for the exercises a plain squat animation
 * mismatches (box, jump, thruster).
 *
 * Named poses share the base squat's standing contact points and bend sign
 * unless a pose has a reason to move them — copying `footR`/`footL`/`armBend`
 * keeps every variant on the same verified stance instead of re-deriving it.
 */
function pose(p: {
  hip: RigPose['hip'];
  torsoAngle: number;
  headTilt: number;
  handR: RigPose['handR'];
  handL: RigPose['handL'];
  footR?: RigPose['footR'];
  footL?: RigPose['footL'];
}): RigPose {
  return {
    footR: [164, 170],
    footL: [155, 170],
    armBend: [1, 1],
    legBend: [-1, -1],
    ...p,
  };
}

// Matches the base pattern's own keyframe 0 — the shared standing top for any
// pose whose rep starts from a normal stance.
const STANDING = pose({ hip: [160, 108], torsoAngle: -88, headTilt: -2, handR: [198, 92], handL: [192, 94] });

// Chair squat: hips travel back more than down, well short of the base squat's
// depth — sitting onto a chair rather than dropping straight down.
const BOX_BOTTOM = pose({
  hip: [140, 122],
  torsoAngle: -80,
  headTilt: -6,
  handR: [188, 98],
  handL: [182, 100],
});

// Jump squat: dip, drive to full extension, then airborne with the feet clear
// of the floor and the knees tucked slightly. `tempo: 'explosive'` in the data
// re-times this same shape; the geometry doesn't need to know about it.
const JUMP_BOTTOM = pose({
  hip: [150, 138],
  torsoAngle: -70,
  headTilt: -6,
  handR: [172, 148],
  handL: [165, 150],
});
// Hip at 108, not 102 — same standing height as keyframe 0. A leg reach of
// 68.1 from y=102 overshot the 62-unit span and clamped both ankles to
// clearance 8, lifting the feet a keyframe before takeoff.
const JUMP_EXTEND = pose({
  hip: [160, 108],
  torsoAngle: -90,
  headTilt: -2,
  handR: [184, 66],
  handL: [178, 68],
});
const JUMP_AIR = pose({
  hip: [160, 96],
  torsoAngle: -88,
  headTilt: -2,
  handR: [188, 76],
  handL: [182, 78],
  footR: [172, 152],
  footL: [163, 154],
});

// Thruster: squat with the hands racked at the shoulders, driving to a locked
// overhead press. Bottom-to-top is a wide enough arc that interpolating it
// directly folds the elbow to a physically impossible 26° mid-rep, so a middle
// keyframe breaks the sweep into two segments the elbow can actually track.
const PRESS_BOTTOM = pose({
  hip: [148, 144],
  torsoAngle: -62,
  headTilt: -8,
  handR: [180, 90],
  handL: [174, 92],
});
const PRESS_MID = pose({
  hip: [154, 126],
  torsoAngle: -75,
  headTilt: -5,
  handR: [180, 60],
  handL: [174, 62],
});
const PRESS_TOP = pose({
  hip: [160, 108],
  torsoAngle: -88,
  headTilt: -2,
  handR: [172, 34],
  handL: [166, 36],
});

export const squat: RigPattern = {
  id: 'squat',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'leg',
  keyframes: [
    {
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: -2,
      handR: [198, 92],
      handL: [192, 94],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [148, 144],
      torsoAngle: -62,
      headTilt: -8,
      handR: [206, 108],
      handL: [200, 110],
      footR: [164, 170],
      footL: [155, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
  poses: {
    box: [STANDING, BOX_BOTTOM],
    jump: [JUMP_BOTTOM, JUMP_EXTEND, JUMP_AIR],
    press: [PRESS_BOTTOM, PRESS_MID, PRESS_TOP],
  },
};
