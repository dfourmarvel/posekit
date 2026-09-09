import type { RigPattern } from '../types';
import { GROUND_Y, pressKeyframes, straightBodyPose } from '../solve';

const TOE_X = 92;
const ANKLE_LIFT = 9;
const HAND: [number, number] = [189.4, 170];

/**
 * Shoulder-to-hand distance at each authored keyframe, measured off the near
 * arm's own root rather than the centre shoulder — the perpendicular depth
 * offset moves it ~2 units, which is worth about 20° of elbow angle. These are
 * what `derive` holds constant when the feet go up: the arms are the support, so
 * a decline plank re-solves the body angle around them instead of stretching
 * them. The two differ only by the breathing drift.
 */
const TOP_REACH = 41.639;
const BOTTOM_REACH = 40.533;

/**
 * High plank — hands under shoulders, arms straight, one rigid body line.
 * Carries the hand-supported plank family.
 *
 * The drift between keyframes is the breathing effect: enough to read as alive,
 * small enough that it never looks like movement the user should copy. It moves
 * the body as one piece, so the line stays straight throughout.
 */
export const plankHold: RigPattern = {
  id: 'plank_hold',
  cycleMs: 3400,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: [
    straightBodyPose({ toeX: TOE_X, bodyAngle: 20.55, hand: HAND, headTilt: 12 }),
    straightBodyPose({ toeX: TOE_X, bodyAngle: 19.9, hand: HAND, headTilt: 13 }),
  ],
  // Decline plank. `elevate: 'feet'` was inert here — the audit's fourth
  // finding — so it drew as a high plank. `pressKeyframes` solves the body angle
  // from the raised ankle by bisection, exactly as `pushup_horizontal` does, so
  // the shoulder–hip–ankle line stays rigid by construction: the toe rises from
  // 172 to 148 on the support block, the hip from 142.4 to 131.9, and the body
  // flattens from 19.4° to 4.8°. Translating the contact instead is what folded
  // the incline push-up's elbow to 5.7°.
  derive: ({ handRise, footRise, handShift }) =>
    pressKeyframes({
      toeX: TOE_X,
      handY: GROUND_Y - handRise,
      ankleY: GROUND_Y - ANKLE_LIFT - footRise,
      topReach: TOP_REACH,
      bottomReach: BOTTOM_REACH,
      handShift,
      headTilt: 12,
    }),
};
