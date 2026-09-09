import type { RigPattern, RigPose, Vec2 } from '../types';
import { GROUND_Y, RIG } from '../solve';

/**
 * Bear plank — hands and toes down, knees bent to a right angle and hovering an
 * inch off the floor, back flat. Mis-mapped onto `plank_hold` today, whose whole
 * contract is a straight shoulder-hip-ankle line; a bear plank is deliberately
 * not that, which is why it needs a pattern rather than a pose.
 *
 * Not derived from `straightBodyPose`. That primitive runs a rigid line from the
 * ankle up through the hip, which is exactly the shape this exercise is not: it
 * puts the ankle 62 units from the hip, and the only way to bend the knee from
 * there is to drag the foot in until the leg folds shut. The first version did
 * that and reached a 41° knee — a crouched ball, not a hover.
 *
 * Derived from the two ground contacts instead. The toes sit at `toeX`, the
 * ankle rides `ANKLE_LIFT` above them because the foot is tucked, and the hip is
 * placed one thigh forward and one thigh up from that ankle. At that separation
 * — thigh and shin at right angles, hypotenuse 43.8 of the 62 available — the IK
 * resolves the knee to the corner of the square, below the hip and just above
 * the ankle's height. Measured: knee 87.3°, sitting at y = 165 with the floor at
 * 172, so it hovers 7.
 *
 * Not the exactly 9 the arithmetic on the hip alone predicts. The leg's root is
 * not the hip centre — it is offset perpendicular to the torso by `halfWidth`
 * (SPEC-07 §4.6) — and solving from that root rather than from the hip is what
 * moves the knee the missing 2 units. The right angle and the hover still fall
 * out of the placement rather than being aimed at; only their exact values are
 * measured rather than derived.
 */
const ANKLE_LIFT = 9;
const TOE_X = 108;
/**
 * On the ground line, not two units above it. The target is past the arm's
 * 46-unit span from the shoulder, so the IK clamps to a straight arm pointing at
 * it — the idiom for a locked limb — and it clamps in BOTH frames, which is the
 * point. Two units higher and only one frame cleared the span, so the elbow
 * flicked between 166° and 177° once a breath; at 192 both cleared it but the
 * drift crossed `arm()`'s "hand lies flat on the floor" threshold instead and
 * the planted hand slid 7 units. Here the elbow reads 176.6° in both frames and
 * the hand moves 0.37.
 */
const HAND: Vec2 = [188, GROUND_Y];

/**
 * `torsoAngle` is the only thing that moves between the two frames — the
 * breathing drift of a static hold. It rotates the shoulder about the hip, which
 * is what a rib cage does; translating the hip instead would slide the planted
 * hands, and drift straight down is what once pushed a forearm plank's elbow
 * through the floor.
 */
function bearPose(torsoAngle: number, headTilt: number): RigPose {
  const ankle: Vec2 = [TOE_X, GROUND_Y - ANKLE_LIFT];
  const hip: Vec2 = [ankle[0] + RIG.thigh, ankle[1] - RIG.shin];

  return {
    hip,
    torsoAngle,
    headTilt,
    handR: HAND,
    handL: HAND,
    footR: ankle,
    footL: ankle,
    // Puts the knee below the hip rather than above the ankle — the two corners
    // the right-angled leg can fold to. Only one of them is off the floor.
    legBend: [-1, -1],
    armBend: [1, 1],
  };
}

export const bearPlank: RigPattern = {
  id: 'bear_plank',
  cycleMs: 3400,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: [bearPose(-12, 10), bearPose(-12.5, 11)],
};
