import type { RigPattern, RigPose } from '../types';

const HIP: [number, number] = [160, 108];
const FOOT_R: [number, number] = [166, 170];
const FOOT_L: [number, number] = [154, 170];

/**
 * Upright row: hands start down at the sides — the contact the lateral raise
 * starts from too — and are drawn IN toward the midline as they rise, while the
 * elbows flare out and up. That inward hand path with outward elbows is the
 * whole difference from the lateral raise, which sweeps the hands out instead.
 * Same `armBend: [-1, 1]`; it is the path, not the sign, that changes.
 *
 * **The hands cannot reach the chin, and an earlier version pretending otherwise
 * drew the arms into the skull.** It arced the hands out to x = 196 and back to
 * [180, 52], which converged both elbows onto (159.9, 43.1) — 4.9 from the head
 * centre at (160, 48), inside its 12-unit radius, and the head paints last, so
 * the upper arms vanished into it. The rig cannot do better: the shoulder root
 * sits at (167, 66) and the chin is a few units away, so a hand there leaves the
 * 46-unit arm folded to about 9°, far under the 28° floor. Chest height with the
 * hands 6 from the midline is as high as this body reaches.
 *
 * Measured at the top: hand [166, 82], elbow at (187.7, 78.2) — above the hand
 * and 21.7 outside it — elbow angle 40.5°, and 41.0 from the head centre. The
 * three hops run straight down the same line, and reach from the arm root falls
 * monotonically 45.5 → 16.0 along it, so no chord cuts inside either end and
 * there is no mid-sweep collapse. Symmetric about x = 160 at every keyframe.
 */
const UPRIGHT_R: Array<[number, number]> = [
  [174, 111],
  [170, 96.5],
  [166, 82],
];
const uprightKeyframes: RigPose[] = UPRIGHT_R.map(([rx, ry]) => ({
  hip: HIP,
  torsoAngle: -90,
  headTilt: 0,
  handR: [rx, ry],
  handL: [320 - rx, ry],
  footR: FOOT_R,
  footL: FOOT_L,
  armBend: [-1, 1],
  legBend: [-1, 1],
}));

/**
 * Carries lateral raise and upright row.
 *
 * The front raise left for a pattern of its own, and a side-view one: seen from
 * the front the arm comes straight at the camera and the movement is invisible,
 * which is the mirror of why a lateral raise cannot be drawn side-on.
 *
 * Front view, unlike most standing patterns. A lateral raise is edge-on from the
 * side, where the arm collapses to a dot and the movement is invisible — the
 * whole point is the arc out to the sides, which only the front shows.
 *
 * Four keyframes, because the hand interpolates in a straight line and the arc
 * it has to travel is 81° wide. Hips-to-shoulder-height in one step cuts a chord
 * 32 from the shoulder, folding the elbow to 87° at the midpoint of a movement
 * whose whole character is a straight arm sweeping up. The intermediate poses
 * keep the hand 45 from the shoulder — the arm's own span — the entire way.
 *
 * The top pose reaches out to [212, 66] rather than [206, 66]: level with the
 * shoulder *and* at full extension, which is where a lateral raise finishes.
 */
export const lateralRaise: RigPattern = {
  id: 'lateral_raise',
  cycleMs: 2400,
  load: 'upperArm',
  footDir: 1,
  view: 'front',
  loop: 'pingpong',
  unilateral: 'arm',
  keyframes: [
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [174, 111],
      handL: [146, 111],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [193.4, 102.5],
      handL: [126.6, 102.5],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [207.1, 86.5],
      handL: [112.9, 86.5],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      hip: [160, 108],
      torsoAngle: -90,
      headTilt: 0,
      handR: [212, 66],
      handL: [108, 66],
      footR: [166, 170],
      footL: [154, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
  ],
  poses: {
    upright: uprightKeyframes,
  },
};
