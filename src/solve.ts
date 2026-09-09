import type { Proportions, RigPose, RigView, ToeMode, Vec2 } from './types';

/** Fixed body proportions. Every exercise shows the same person — never vary these. */
export const RIG = {
  upperArm: 24,
  foreArm: 22,
  thigh: 31,
  shin: 31,
  torso: 42,
  neck: 18,
  headR: 12,
  hand: 9,
  foot: 11,
} as const;

/**
 * The full build the rig renders by default: `RIG`'s bone lengths plus the
 * stroke widths and near/far offsets that used to be stranded in
 * ExerciseFigure and `halfWidth`. Every render path takes an optional
 * `Proportions` override that defaults to this, so passing nothing reproduces
 * today's figure exactly.
 */
export const DEFAULT_PROPORTIONS: Proportions = {
  ...RIG,
  // Hand and foot are narrower than the limb they extend, which is what gives
  // the wrist and ankle a visible joint instead of one continuous mass. The
  // torso is narrower than the arm's near/far offset can separate it from, so
  // slimming it is what makes a hanging arm read as a limb rather than shading.
  width: { torso: 19, arm: 13, leg: 14, hand: 10, foot: 10 },
  halfWidth: { side: 2, front: 7 },
};

export const GROUND_Y = 172;
export const VIEW_BOX = '80 8 160 178';
export const BOUNDS = { minX: 82, maxX: 238, minY: 10, maxY: 176 } as const;

const deg = (d: number) => (d * Math.PI) / 180;

/** Half the shoulder/hip width, used to offset the near and far limb pairs. */
export function halfWidth(view: RigView, proportions: Proportions = DEFAULT_PROPORTIONS): number {
  return proportions.halfWidth[view];
}

export type Limb = {
  rootX: number;
  rootY: number;
  jointX: number;
  jointY: number;
  endX: number;
  endY: number;
  /** End of the hand/foot segment. */
  tipX: number;
  tipY: number;
};

export type Skeleton = {
  hipX: number;
  hipY: number;
  shoulderX: number;
  shoulderY: number;
  headX: number;
  headY: number;
  armR: Limb;
  armL: Limb;
  legR: Limb;
  legL: Limb;
};

/**
 * Two-bone inverse kinematics. Limbs are authored as contact targets — where
 * the hand or foot is — and the elbow/knee is solved from them.
 *
 * The reach distance is clamped, so the returned end point may differ from the
 * requested target: an over-reaching target yields a straight limb pointing at
 * it rather than a stretched bone. Straight-leg poses depend on this.
 */
export function solveLimb(
  rootX: number,
  rootY: number,
  targetX: number,
  targetY: number,
  l1: number,
  l2: number,
  bend: number,
): { jointX: number; jointY: number; endX: number; endY: number } {
  const dx = targetX - rootX;
  const dy = targetY - rootY;
  // Kept tiny so a fully-extended limb reads as straight: at l1+l2-0.4 a 62-long
  // leg still bulges 3.5 px at the knee, which is visible against a 14 px stroke.
  const reachMax = l1 + l2 - 0.02;
  const reachMin = Math.abs(l1 - l2) + 0.02;
  const d = Math.min(Math.max(Math.hypot(dx, dy), reachMin), reachMax);
  const base = Math.atan2(dy, dx);
  const cos = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a = Math.acos(cos);
  const joint = base + bend * a;
  return {
    jointX: rootX + Math.cos(joint) * l1,
    jointY: rootY + Math.sin(joint) * l1,
    endX: rootX + Math.cos(base) * d,
    endY: rootY + Math.sin(base) * d,
  };
}

function arm(
  rootX: number,
  rootY: number,
  target: readonly [number, number],
  bend: number,
  p: Proportions,
): Limb {
  const s = solveLimb(rootX, rootY, target[0], target[1], p.upperArm, p.foreArm, bend);
  const dx = s.endX - s.jointX;
  const dy = s.endY - s.jointY;
  const len = Math.hypot(dx, dy) || 1;

  // A hand touching the floor lies flat along it. Following the forearm angle
  // instead would drive the palm through the ground at the bottom of a push-up.
  if (s.endY >= GROUND_Y - 2.5) {
    return {
      rootX,
      rootY,
      ...s,
      tipX: s.endX + (dx >= 0 ? p.hand : -p.hand),
      tipY: s.endY,
    };
  }

  return {
    rootX,
    rootY,
    ...s,
    tipX: s.endX + (dx / len) * p.hand,
    tipY: Math.min(s.endY + (dy / len) * p.hand, GROUND_Y),
  };
}

function leg(
  rootX: number,
  rootY: number,
  target: readonly [number, number],
  bend: number,
  footDir: 1 | -1,
  toe: ToeMode,
  p: Proportions,
): Limb {
  const s = solveLimb(rootX, rootY, target[0], target[1], p.thigh, p.shin, bend);

  if (toe === 'tucked') {
    // Prone work (push-up, plank) is done on the balls of the feet: the ankle
    // rides above the floor and the foot angles down and back to reach it.
    const drop = Math.min(p.foot, Math.max(0, GROUND_Y - s.endY));
    const back = Math.sqrt(Math.max(0, p.foot * p.foot - drop * drop));
    return { rootX, rootY, ...s, tipX: s.endX + footDir * back, tipY: s.endY + drop };
  }

  return {
    rootX,
    rootY,
    ...s,
    tipX: s.endX + footDir * p.foot,
    tipY: Math.min(s.endY, GROUND_Y),
  };
}

/**
 * Forward kinematics from the hip root, then IK for both limb pairs.
 *
 * The near/far limb offset is perpendicular to the torso, not horizontal. With a
 * horizontal offset a near-vertical body is fine but a near-horizontal one (any
 * prone pattern) changes how far each leg must stretch to the same floor
 * contact, so one leg clamps straight while the other visibly bends.
 */
export function buildSkeleton(
  pose: RigPose,
  footDir: 1 | -1,
  view: RigView,
  toe: ToeMode = 'flat',
  proportions: Proportions = DEFAULT_PROPORTIONS,
): Skeleton {
  const hw = halfWidth(view, proportions);
  const [hipX, hipY] = pose.hip;

  const t = deg(pose.torsoAngle);
  const shoulderX = hipX + Math.cos(t) * proportions.torso;
  const shoulderY = hipY + Math.sin(t) * proportions.torso;

  const offX = -Math.sin(t) * hw;
  const offY = Math.cos(t) * hw;

  const h = deg(pose.torsoAngle + pose.headTilt);

  return {
    hipX,
    hipY,
    shoulderX,
    shoulderY,
    headX: shoulderX + Math.cos(h) * proportions.neck,
    headY: shoulderY + Math.sin(h) * proportions.neck,
    armR: arm(shoulderX + offX, shoulderY + offY, pose.handR, pose.armBend[0], proportions),
    armL: arm(shoulderX - offX, shoulderY - offY, pose.handL, pose.armBend[1], proportions),
    legR: leg(hipX + offX, hipY + offY, pose.footR, pose.legBend[0], footDir, toe, proportions),
    legL: leg(hipX - offX, hipY - offY, pose.footL, pose.legBend[1], footDir, toe, proportions),
  };
}

/**
 * Keyframes for a straight-body pressing movement, derived from where the hands
 * and toes actually rest.
 *
 * `reach` is the shoulder-to-hand distance, which is what sets the elbow angle:
 * near the arm's 46-unit span the elbow is locked out, and 30 puts it at about a
 * right angle. Solving the body angle from that — rather than nudging contact
 * points — is what makes the incline and decline variants correct instead of
 * folding the arm shut.
 */
export function pressKeyframes(opts: {
  toeX: number;
  handY: number;
  ankleY: number;
  topReach: number;
  bottomReach: number;
  /** Moves the hands along the floor. Grip changes go through here so the body
   *  angle is re-solved, instead of stretching the arm past its span. */
  handShift?: number;
  headTilt?: number;
  armBend?: number;
}): RigPose[] {
  const {
    toeX,
    handY,
    ankleY,
    topReach,
    bottomReach,
    handShift = 0,
    headTilt = 10,
    armBend = 1,
  } = opts;
  const span = RIG.thigh + RIG.shin + RIG.torso;
  const ankleLift = GROUND_Y - ankleY;

  const level = Math.min(1, Math.max(-1, (ankleY - (handY - topReach)) / span));
  const squareAngle = (Math.asin(level) * 180) / Math.PI;
  const handX = toeX + span * Math.cos((squareAngle * Math.PI) / 180) + handShift;
  const hand: Vec2 = [handX, handY];

  // Measured from the near arm's actual root, which the perpendicular depth
  // offset moves ~2 units off the centre line — enough to cost 20° of lockout
  // if you solve against the centre shoulder instead.
  const hw = halfWidth('side');
  const reachAt = (angleDeg: number) => {
    const a = (-angleDeg * Math.PI) / 180;
    const sx = toeX + Math.cos(a) * span - Math.sin(a) * hw;
    const sy = ankleY + Math.sin(a) * span + Math.cos(a) * hw;
    return Math.hypot(sx - handX, sy - handY);
  };

  // Shoulder-to-hand grows monotonically as the body rises, so bisect for the
  // angle that produces the elbow position we want.
  const angleFor = (target: number) => {
    let lo = 0;
    let hi = 70;
    for (let i = 0; i < 48; i += 1) {
      const mid = (lo + hi) / 2;
      if (reachAt(mid) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  return [
    straightBodyPose({ toeX, bodyAngle: angleFor(topReach), hand, ankleLift, headTilt, armBend }),
    straightBodyPose({
      toeX,
      bodyAngle: angleFor(bottomReach),
      hand,
      ankleLift,
      headTilt: headTilt + 4,
      armBend,
    }),
  ];
}

/**
 * Builds a pose whose shoulder, hip and ankle are collinear with the legs fully
 * extended — the rigid body line a push-up and a plank exist to train.
 *
 * Authoring this by placing the hip by eye is what produced a 24° pike in the
 * first version: collinearity has to be structural, not arithmetic done by hand.
 */
export function straightBodyPose(opts: {
  /** Ground contact of the toes. */
  toeX: number;
  /** Degrees the body line rises from ankle toward shoulder. */
  bodyAngle: number;
  /** Where the hands are planted. */
  hand: Vec2;
  /** How far the ankle rides above the toe contact. */
  ankleLift?: number;
  headTilt?: number;
  armBend?: number;
}): RigPose {
  const { toeX, bodyAngle, hand, ankleLift = 9, headTilt = 10, armBend = 1 } = opts;
  const a = deg(-bodyAngle);
  const ankle: Vec2 = [toeX, GROUND_Y - ankleLift];
  const legLen = RIG.thigh + RIG.shin;

  const hip: Vec2 = [ankle[0] + Math.cos(a) * legLen, ankle[1] + Math.sin(a) * legLen];

  // Left and right share a contact point. Separation comes from the roots' own
  // perpendicular offset, so both limbs keep an identical, fully-extended reach;
  // spreading the targets horizontally makes the far limb bend on a prone body.
  return {
    hip,
    torsoAngle: -bodyAngle,
    headTilt,
    handR: hand,
    handL: hand,
    footR: ankle,
    footL: ankle,
    armBend: [armBend, armBend],
    legBend: [-1, -1],
  };
}

/** Signed perpendicular offset of p from the a→b line. Positive = clockwise side. */
function sideOf(a: Vec2, b: Vec2, p: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

/**
 * Where the hip sits when both the shoulder and the foot are pinned contacts.
 *
 * A supine figure resting on its upper back holds the shoulder still while the
 * pelvis travels: the hip is therefore `torso` from the shoulder and
 * `hipToFoot` from the planted foot, which is a circle intersection with two
 * answers — the pelvis lifted above the shoulder→foot line, or sagged below it.
 * `side` picks, following the sign convention of `sideOf`.
 *
 * Returns null when the two circles do not meet, so a caller can keep the pose
 * it already had rather than inventing one. This is the supine counterpart of
 * `straightBodyPose`: the hip comes out of the contacts, never off the eye.
 */
export function hipFromContacts(
  shoulder: Vec2,
  foot: Vec2,
  hipToFoot: number,
  side: number,
): { hip: Vec2; torsoAngle: number } | null {
  const dx = foot[0] - shoulder[0];
  const dy = foot[1] - shoulder[1];
  const d = Math.hypot(dx, dy);
  const r1 = RIG.torso;
  if (d === 0 || d > r1 + hipToFoot || d < Math.abs(r1 - hipToFoot)) return null;

  const a = (r1 * r1 - hipToFoot * hipToFoot + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mid: Vec2 = [shoulder[0] + (a * dx) / d, shoulder[1] + (a * dy) / d];
  const options: Vec2[] = [
    [mid[0] + (h * dy) / d, mid[1] - (h * dx) / d],
    [mid[0] - (h * dy) / d, mid[1] + (h * dx) / d],
  ];

  // Keep the branch the caller asked for. Picking the nearer point instead lets
  // one keyframe of a pair land on the lifted branch and the other on the
  // sagged one for no reason the pose asked for.
  const hip = options.find((o) => Math.sign(sideOf(shoulder, foot, o)) === Math.sign(side)) ?? options[0];
  return {
    hip,
    torsoAngle: (Math.atan2(shoulder[1] - hip[1], shoulder[0] - hip[0]) * 180) / Math.PI,
  };
}

/**
 * A supine pose with its foot contact raised onto a support, for `elevate:
 * 'feet'` on a pattern whose shoulders stay on the floor.
 *
 * The shoulder is the pinned contact, so it does not move; the feet rise; and
 * the hip is re-solved from both through `hipFromContacts`, preserving the near
 * leg's hip-to-foot distance so the knee keeps the angle the pose authored. The
 * head keeps its absolute direction rather than its tilt relative to the torso —
 * a head resting on the floor does not rotate because the pelvis lifted.
 *
 * Translating the contact alone is what SPEC-07 §6.2 forbids, and on this chain
 * it would simply do nothing: the audit's fourth finding is that `elevate`
 * parses and resolves to a no-op on every pattern with no `derive`.
 */
export function raiseFootContact(pose: RigPose, rise: number): RigPose {
  if (!rise) return pose;
  const t = deg(pose.torsoAngle);
  const shoulder: Vec2 = [
    pose.hip[0] + Math.cos(t) * RIG.torso,
    pose.hip[1] + Math.sin(t) * RIG.torso,
  ];
  const foot: Vec2 = [pose.footR[0], pose.footR[1] - rise];
  const hipToFoot = Math.hypot(pose.footR[0] - pose.hip[0], pose.footR[1] - pose.hip[1]);
  const solved = hipFromContacts(shoulder, foot, hipToFoot, sideOf(shoulder, pose.footR, pose.hip));
  if (!solved) return pose;

  return {
    ...pose,
    hip: solved.hip,
    torsoAngle: solved.torsoAngle,
    headTilt: pose.headTilt + pose.torsoAngle - solved.torsoAngle,
    footR: foot,
    footL: [pose.footL[0], pose.footL[1] - rise],
  };
}

/** Every point the renderer draws, including the head circle's extremes. */
export function skeletonPoints(s: Skeleton): Array<[number, number]> {
  const limbs = [s.armR, s.armL, s.legR, s.legL];
  const points: Array<[number, number]> = [
    [s.hipX, s.hipY],
    [s.shoulderX, s.shoulderY],
    [s.headX - RIG.headR, s.headY - RIG.headR],
    [s.headX + RIG.headR, s.headY + RIG.headR],
  ];
  for (const l of limbs) {
    points.push([l.jointX, l.jointY], [l.endX, l.endY], [l.tipX, l.tipY]);
  }
  return points;
}
