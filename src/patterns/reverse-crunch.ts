import type { RigPattern, RigPose, Vec2 } from '../types';

/**
 * Carries 6 exercises: reverse crunch, leg and knee raises, flutter and scissor
 * kicks, heel taps.
 *
 * The mirror of `crunch`: the shoulders stay planted and the legs travel. Supine
 * with the head to the right, so the legs extend left along the floor and tuck
 * back toward the chest.
 */
const HAND: [number, number] = [145, 170];
const HIP: Vec2 = [152, 158];

/** Base pose builder: hip/torso/hands fixed, only the feet vary per named pose. */
function pose(footR: Vec2, footL: Vec2 = footR): RigPose {
  return {
    hip: HIP,
    torsoAngle: 0,
    headTilt: 0,
    handR: HAND,
    handL: HAND,
    footR,
    footL,
    armBend: [-1, -1],
    legBend: [1, 1],
  };
}

// Legs stay straight (near the leg's 62-unit span) at both ends — low along
// the floor, then vertical over the hip. Distinct from `bent`: the reach stays
// close to full extension throughout instead of folding to ~90° at the knee.
const STRAIGHT: RigPose[] = [pose([94, 166]), pose([152, 101])];

// Reach is held at ~43.8 units at both ends — the distance that puts the knee
// at ~90° by the law of cosines regardless of direction — while the target
// swings from low to overhead. That keeps the knee bend constant and only the
// thigh direction travels, which is the bent-knee raise.
const BENT_LOW: Vec2 = [108.83, 165.61];
const BENT_HIGH: Vec2 = [144.39, 114.83];
const BENT: RigPose[] = [pose(BENT_LOW), pose(BENT_HIGH)];

// Both legs held at a ~60-unit reach (near-straight, under the 62-unit span)
// throughout — flutter kicks never touch down. footR/footL swap between a
// 17-unit and a 41-unit floor clearance for the alternating kick; the old
// targets ([94,158]/[94,170]) put one foot at a 2-unit clearance every cycle
// and only separated the pair by 12 units, which read as a static hold.
const FLUTTER: RigPose[] = [pose([94, 155], [99, 131]), pose([99, 131], [94, 155])];

// Same low, near-straight leg range as flutter but a much wider swing, and the
// two feet swap targets outright — linear interpolation crosses them at
// mid-cycle, which is the legs passing each other.
const SCISSOR: RigPose[] = [pose([108, 145], [95, 168]), pose([95, 168], [108, 145])];

// Same ~43.8-unit reach as `bent` (knee held near 90°), but aimed low so the
// foot sits at the floor; footR/footL swap between the down-tap and the
// lifted foot for the alternating heel tap. HEEL_UP used to sit only 7.9
// units off the floor, barely distinct from HEEL_DOWN's 0 — raised to a
// 29-unit clearance so the lift reads clearly next to the tap.
//
// HEEL_DOWN sits a unit ABOVE the ground line, not on it. Authored at 172.27 it
// was a quarter-unit under, and `range: 'full'` extrapolates the far foot's
// travel by 1.15 — from HEEL_UP that landed at 175.6, four tenths of a unit
// from BOUNDS.maxY. The foot's own thickness closes the visual gap.
const HEEL_DOWN: Vec2 = [110.55, 171];
const HEEL_UP: Vec2 = [108.94, 150];
const HEEL_TAP: RigPose[] = [pose(HEEL_DOWN, HEEL_UP), pose(HEEL_UP, HEEL_DOWN)];

export const reverseCrunch: RigPattern = {
  id: 'reverse_crunch',
  cycleMs: 2400,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [
    {
      hip: [152, 158],
      torsoAngle: 0,
      headTilt: 0,
      handR: HAND,
      handL: HAND,
      footR: [94, 164],
      footL: [94, 164],
      armBend: [-1, -1],
      legBend: [1, 1],
    },
    {
      hip: [152, 158],
      torsoAngle: 0,
      headTilt: 0,
      handR: HAND,
      handL: HAND,
      footR: [138, 126],
      footL: [138, 126],
      armBend: [-1, -1],
      legBend: [1, 1],
    },
  ],
  poses: {
    straight: STRAIGHT,
    bent: BENT,
    flutter: FLUTTER,
    scissor: SCISSOR,
    heelTap: HEEL_TAP,
  },
};
