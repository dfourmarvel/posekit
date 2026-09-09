import type { RigPattern, RigPose } from '../types';

/**
 * Carries 6 exercises: forward, reverse and walking lunges, split squats and
 * their loaded variants. The curtsy and lateral directions left for patterns of
 * their own: both happen in the frontal plane, which a side view cannot show.
 *
 * The near leg is the front one and the far leg is the rear. The rear ankle sits
 * above the floor because a lunge is performed on the ball of that foot, and its
 * knee drops toward the floor rather than the ankle staying planted.
 *
 * Both arms take the same `armBend` sign, and both hands stay on the NEAR side
 * of the midline. The base keyframes use the house standing-side-view offsets,
 * [172, 112] / [168, 114], shared with calf_raise, curl and small_jump; the
 * named poses track their own hip and so sit near but not on those numbers.
 * What matters is the near side: tucked in past roughly x = 166 the arm
 * disappears inside the 25-wide torso stroke and the figure reads as armless.
 * This pattern shipped mirrored — `armBend: [-1, 1]` with the hands straddling
 * the midline — which is the front-view convention. Side-on it put the elbows
 * 22 units apart around a shoulder at x = 161.5, flinging the far one out behind
 * the figure. Measured and corrected 2026-09-03; `lunge` was the only side-view
 * pattern still doing it.
 *
 * Knee travel past the front ankle, worst over a full cycle: base 7.3,
 * split 9.1, reverse 12.4, walking 13.6. Walking is the family's outlier and is
 * the one to look at first if a lunge ever reads as knee-past-toes.
 */
function pose(p: {
  hip: RigPose['hip'];
  torsoAngle: number;
  headTilt: number;
  handR: RigPose['handR'];
  handL: RigPose['handL'];
  footR: RigPose['footR'];
  footL: RigPose['footL'];
}): RigPose {
  return {
    armBend: [1, 1],
    legBend: [-1, -1],
    ...p,
  };
}

// Split squat: a stationary stance. Both feet are already split front/rear in
// both keyframes — only the hip's depth changes — unlike the base lunge, whose
// feet start together and step into the stance.
const SPLIT_FRONT: RigPose['footR'] = [184, 170];
const SPLIT_REAR: RigPose['footL'] = [128, 160];
const SPLIT_TOP = pose({
  hip: [164, 116],
  torsoAngle: -86,
  headTilt: 2,
  handR: [172, 114],
  handL: [166, 116],
  footR: SPLIT_FRONT,
  footL: SPLIT_REAR,
});
const SPLIT_BOTTOM = pose({
  hip: [160, 138],
  torsoAngle: -82,
  headTilt: 4,
  handR: [172, 138],
  handL: [166, 140],
  footR: SPLIT_FRONT,
  footL: SPLIT_REAR,
});

// Bulgarian split squat: the same stationary stance, with the rear foot raised
// well clear of the floor instead of resting on the ball of the foot.
const REAR_ELEVATED_FRONT: RigPose['footR'] = [184, 170];
const REAR_ELEVATED_REAR: RigPose['footL'] = [124, 130];
const REAR_ELEVATED_TOP = pose({
  hip: [164, 116],
  torsoAngle: -86,
  headTilt: 2,
  handR: [172, 114],
  handL: [166, 116],
  footR: REAR_ELEVATED_FRONT,
  footL: REAR_ELEVATED_REAR,
});
const REAR_ELEVATED_BOTTOM = pose({
  hip: [160, 140],
  torsoAngle: -80,
  headTilt: 5,
  handR: [172, 140],
  handL: [166, 142],
  footR: REAR_ELEVATED_FRONT,
  footL: REAR_ELEVATED_REAR,
});

// Reverse lunge: the rear foot is the one that travels, stepping back from a
// feet-together start, while the front foot stays roughly where it began — the
// mirror image of the base pattern, where the front foot does the travelling.
const REVERSE_TOP = pose({
  hip: [160, 108],
  torsoAngle: -88,
  headTilt: 2,
  handR: [170, 112],
  handL: [164, 114],
  footR: [166, 170],
  footL: [154, 170],
});
// Hip carried 12 units left of the front foot (was directly above it), so the
// hip-to-ankle line isn't near-vertical any more. Left as-is, the near-vertical
// line drove the knee's IK bulge almost entirely sideways, tracking the front
// knee 21.1 units past the ankle; shifting the hip brings that to ~12.4, in
// line with the other lunge poses (7.3-13.6). Hand targets moved the same 12
// units so the arm's reach relative to the shoulder is unchanged.
const REVERSE_BOTTOM = pose({
  hip: [148, 132],
  torsoAngle: -84,
  headTilt: 4,
  handR: [158, 136],
  handL: [152, 138],
  footR: [168, 170],
  footL: [116, 156],
});

// Walking lunge: a lunge, a tall stance passing through the middle, then a
// lunge again — but the whole stance has advanced forward rather than
// returning under the hips, since walking lunges travel across the floor.
const WALK_A = pose({
  hip: [158, 132],
  torsoAngle: -85,
  headTilt: 3,
  handR: [166, 134],
  handL: [160, 136],
  footR: [176, 170],
  footL: [132, 160],
});
const WALK_TALL = pose({
  hip: [176, 108],
  torsoAngle: -88,
  headTilt: 1,
  handR: [172, 112],
  handL: [166, 114],
  footR: [182, 170],
  footL: [172, 170],
});
const WALK_B = pose({
  hip: [194, 132],
  torsoAngle: -85,
  headTilt: 3,
  handR: [202, 134],
  handL: [196, 136],
  footR: [212, 170],
  footL: [168, 160],
});

export const lunge: RigPattern = {
  id: 'lunge',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  unilateral: 'leg',
  keyframes: [
    {
      hip: [160, 108],
      torsoAngle: -88,
      headTilt: 2,
      handR: [172, 112],
      handL: [168, 114],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: [158, 132],
      torsoAngle: -85,
      headTilt: 3,
      handR: [170, 134],
      handL: [166, 136],
      footR: [190, 170],
      footL: [120, 158],
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
  poses: {
    split: [SPLIT_TOP, SPLIT_BOTTOM],
    rearElevatedSplit: [REAR_ELEVATED_TOP, REAR_ELEVATED_BOTTOM],
    reverse: [REVERSE_TOP, REVERSE_BOTTOM],
    walking: [WALK_A, WALK_TALL, WALK_B],
  },
};
