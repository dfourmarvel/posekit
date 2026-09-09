import type { RigPattern, RigPose } from '../types';
import { GROUND_Y, pressKeyframes, straightBodyPose } from '../solve';

const ANKLE_LIFT = 9;
const TOE_X = 92;
/** Near the arm's 46-unit span at the top (locked out), a right angle at the bottom. */
const TOP_REACH = 45.5;
const BOTTOM_REACH = 30;

const [TOP, BOTTOM] = pressKeyframes({
  toeX: TOE_X,
  handY: GROUND_Y,
  ankleY: GROUND_Y - ANKLE_LIFT,
  topReach: TOP_REACH,
  bottomReach: BOTTOM_REACH,
});

/**
 * Clap push-up: bottom, drive up to the same locked-out top the base pattern
 * uses, then airborne — same body line, hands pulled in off the floor. Measured
 * at the airborne keyframe: elbow 44.4°/42.5° (R/L), comfortably clear of the
 * 28° floor; the hand target sits 17.5 from the arm root, well inside the
 * 46-unit reach so it doesn't clamp.
 */
const AIRBORNE: RigPose = { ...TOP, handR: [172, 128], handL: [172, 128] };

/**
 * Pseudo planche push-up: same toe contact and press mechanics as the base
 * pattern, but the hand target is walked back toward the hip instead of
 * sitting under the shoulder. Measured: shoulder sits 22.9 (top) / 27.4
 * (bottom) ahead of the hand in x — against ~0.7 for a standard push-up's own
 * top — which is what reads as the torso leaning out past the hands. Elbow
 * 168.0°/176.6° at top and 91.3°/98.7° at bottom, both clear of 28°; reach off
 * the arm root stays at 45.75/48.47 and 32.92/34.91, so the top keyframe is
 * deliberately right at the clamp (matching the base pattern's own top) rather
 * than past it.
 */
const LEAN_HAND: [number, number] = [168, 172];
const LEAN_TOP = straightBodyPose({
  toeX: TOE_X,
  bodyAngle: 18,
  hand: LEAN_HAND,
  ankleLift: ANKLE_LIFT,
  headTilt: 8,
  armBend: 1,
});
const LEAN_BOTTOM = straightBodyPose({
  toeX: TOE_X,
  bodyAngle: 6,
  hand: LEAN_HAND,
  ankleLift: ANKLE_LIFT,
  headTilt: 12,
  armBend: 1,
});

/**
 * Carries 12 exercises: push-up and every hand-position / elevation variant.
 * The sphinx push-up left for `sphinx_press`, which starts on the forearms.
 *
 * Both keyframes are derived, so the shoulder–hip–ankle line is rigid by
 * construction and the elbow travels a real 165°→90°. Hand-authoring the hip
 * position is what produced a 24° pike and a permanent partial rep.
 *
 * `elevate` re-derives from a raised hand or toe contact rather than translating
 * one — raising the hands alone folds the arm shut to an impossible 6°.
 */
export const pushupHorizontal: RigPattern = {
  id: 'pushup_horizontal',
  cycleMs: 2200,
  load: 'upperArm',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  unilateral: 'arm',
  keyframes: [TOP, BOTTOM],
  derive: ({ handRise, footRise, handShift }) =>
    pressKeyframes({
      toeX: TOE_X,
      handY: GROUND_Y - handRise,
      ankleY: GROUND_Y - ANKLE_LIFT - footRise,
      topReach: TOP_REACH,
      bottomReach: BOTTOM_REACH,
      handShift,
    }),
  poses: {
    clap: [BOTTOM, TOP, AIRBORNE],
    lean: [LEAN_TOP, LEAN_BOTTOM],
  },
};
