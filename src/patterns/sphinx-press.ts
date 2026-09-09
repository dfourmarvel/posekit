import type { RigPattern } from '../types';
import { GROUND_Y, pressKeyframes, straightBodyPose } from '../solve';

const TOE_X = 92;
/** Locked out on the hands, near the arm's 46-unit span — the same top the
 *  hand-supported push-up uses. */
const TOP_REACH = 45.5;
/**
 * The bottom is authored directly with `straightBodyPose` rather than via
 * `pressKeyframes`, because `bottomReach` (shoulder-to-hand distance) does not
 * pin the elbow to the floor — it only pins the elbow angle, and a version
 * tuned to `bottomReach: 32` measured with the elbow at (174.9, 155.4), 16.6
 * units above the ground. `bodyAngle`/`hand` here are the same numbers
 * `plank_forearm` uses for the same toeX and ankle lift, because a forearm
 * flat on the ground at the same body incline solves to the same contact
 * point regardless of which exercise it belongs to. Measured on this pattern:
 * elbow (near arm) at (194.7, 172.5), 0.5 above GROUND_Y, forearm angled
 * ~5° off horizontal, elbow angle 84°.
 */
const BOTTOM_BODY_ANGLE = 9.13;
const BOTTOM_HAND: readonly [number, number] = [216.7, 170.5];

/**
 * Sphinx push-up — starts on the forearms, presses up by extending the elbows
 * until the weight is on the hands, then lowers back down. Mis-mapped onto
 * `pushup_horizontal` today, which presses from the hands throughout and so
 * never shows the forearm start.
 *
 * The top keyframe still comes from `pressKeyframes` (locked out on the
 * hands, elbow angle 163°, the same top the hand-supported push-up uses) so
 * the shoulder-hip-ankle line stays rigid there too — only the bottom needed
 * a different derivation, since the rig has no forearm contact target and
 * `pressKeyframes` only ever solves for a hand one.
 */
export const sphinxPress: RigPattern = {
  id: 'sphinx_press',
  cycleMs: 2400,
  load: 'upperArm',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: (() => {
    const [top] = pressKeyframes({
      toeX: TOE_X,
      handY: GROUND_Y,
      ankleY: GROUND_Y - 9,
      topReach: TOP_REACH,
      bottomReach: TOP_REACH, // unused below; the bottom is authored separately.
    });
    const bottom = straightBodyPose({
      toeX: TOE_X,
      bodyAngle: BOTTOM_BODY_ANGLE,
      hand: BOTTOM_HAND,
      headTilt: 10,
      armBend: 1,
    });
    return [bottom, top];
  })(),
};
