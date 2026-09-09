import type { RigPattern, RigPose, Vec2 } from '../types';

/**
 * Prone back raises: superman, reverse snow angel, prone Y/T/W, swimmer.
 *
 * Face down with the head to the RIGHT. The trunk lies flat on the floor and
 * stays there — only the arms and legs lift, which is the entire exercise.
 *
 * Deliberately not built from `straightBodyPose`: that primitive makes the ankle
 * the ground contact and runs a rigid line up to the shoulder, which is right
 * for a plank but tilts a superman onto its toes with the chest in the air.
 */
const HIP: Vec2 = [150, 158];
const TORSO_ANGLE = -3;

function pronePose(hand: Vec2, foot: Vec2, headTilt = 2): RigPose {
  return {
    hip: HIP,
    torsoAngle: TORSO_ANGLE,
    headTilt,
    handR: hand,
    handL: hand,
    footR: foot,
    footL: foot,
    armBend: [1, 1],
    legBend: [1, 1],
  };
}

/**
 * Two-target variant for genuinely asymmetric prone poses. `RigPose` already
 * carries `handR`/`handL` and `footR`/`footL` separately — `pronePose` above
 * just never used that, since every other pose on this pattern moves both
 * sides together. A swimmer doesn't: opposite arm and leg lift as a pair.
 */
function pronePoseAlt(handR: Vec2, handL: Vec2, footR: Vec2, footL: Vec2, headTilt = 2): RigPose {
  return {
    hip: HIP,
    torsoAngle: TORSO_ANGLE,
    headTilt,
    handR,
    handL,
    footR,
    footL,
    armBend: [1, 1],
    legBend: [1, 1],
  };
}

/** Arms reach past the head, to the right. */
const ARMS_DOWN: Vec2 = [224, 153];
const ARMS_UP: Vec2 = [222, 132];
const ARMS_Y: Vec2 = [226, 128];
const ARMS_T: Vec2 = [218, 140];
const ARMS_W: Vec2 = [206, 138];

/** Legs trail to the left; lifting them is the other half of the movement. */
const LEGS_DOWN: Vec2 = [90, 163];
const LEGS_UP: Vec2 = [90, 150];
/**
 * Swimmer's own "down" foot target, 2 units short of `LEGS_DOWN`. `range:
 * 'full'` extrapolates a pose's later frames 15% further from its first, and
 * `alternate`'s first frame puts a leg at `LEGS_UP` and its second at "down" —
 * the opposite order from every other pose here, all of which start at
 * `LEGS_DOWN`. Extrapolating past `LEGS_DOWN` itself swings the tucked toe to
 * x=81.6, one unit outside the x∈[82,238] bound; measured at x=84.2 here.
 */
const LEGS_DOWN_SWIM: Vec2 = [90, 161];

export const proneRaise: RigPattern = {
  id: 'prone_raise',
  cycleMs: 2600,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: [pronePose(ARMS_DOWN, LEGS_DOWN), pronePose(ARMS_UP, LEGS_UP, 6)],
  poses: {
    // Arms and legs rise together.
    superman: [pronePose(ARMS_DOWN, LEGS_DOWN), pronePose(ARMS_UP, LEGS_UP, 6)],
    // Arms sweep while the legs stay down.
    angel: [pronePose(ARMS_UP, LEGS_DOWN, 5), pronePose(ARMS_DOWN, LEGS_DOWN)],
    Y: [pronePose(ARMS_DOWN, LEGS_DOWN), pronePose(ARMS_Y, LEGS_DOWN, 5)],
    T: [pronePose(ARMS_DOWN, LEGS_DOWN), pronePose(ARMS_T, LEGS_DOWN, 4)],
    W: [pronePose(ARMS_DOWN, LEGS_DOWN), pronePose(ARMS_W, LEGS_DOWN, 4)],
    // Swimmer: right arm + left leg rise together while the other pair stays
    // down, then swap. Reuses superman's own ARMS_DOWN/ARMS_UP targets (and
    // LEGS_DOWN_SWIM in place of LEGS_DOWN — see its comment), applied per
    // side instead of to both — measured elbow 88.6–118.4° and knee
    // 151.6–158.7° across both frames, and the R/L swap between frames
    // doesn't fold either limb: worst measured mid-interpolation elbow 88.4°,
    // knee 150.1°.
    alternate: [
      pronePoseAlt(ARMS_UP, ARMS_DOWN, LEGS_DOWN_SWIM, LEGS_UP, 4),
      pronePoseAlt(ARMS_DOWN, ARMS_UP, LEGS_UP, LEGS_DOWN_SWIM, 4),
    ],
  },
};
