import type { RigPattern } from '../types';

/**
 * Carries 3 exercises: wall slide, arm circles, Cuban rotation.
 *
 * The hand sweeps an arc at a roughly constant radius from the shoulder, which
 * keeps the arm near full extension the whole way round. That is what these
 * movements are: the shoulder travels through its range while the elbow stays
 * quiet.
 *
 * Three keyframes, not two. Interpolating straight from a low hand to a raised
 * one draws a chord that passes within 19 units of the shoulder, folding the
 * elbow to 48° halfway through and then reopening it — the arm appears to
 * collapse and recover mid-rep. The middle frame carries the hand out in front
 * so the path follows the arc instead of cutting across it.
 */
const HAND_LOW: [number, number] = [185, 103];
const HAND_FORWARD: [number, number] = [205, 66];
const HAND_HIGH: [number, number] = [185, 29];

const base = {
  hip: [160, 108] as [number, number],
  torsoAngle: -88,
  headTilt: -2,
  footR: [164, 170] as [number, number],
  footL: [155, 170] as [number, number],
  armBend: [-1, -1] as [number, number],
  legBend: [-1, -1] as [number, number],
};

/**
 * Wall slide. Elbows start low against the wall (armR root ~(163.5,66.1);
 * measured elbow 80.3°/87.9° R/L at the low hand) and slide up until the arm
 * is nearly overhead (elbow opens to 117.3°/127.8°). Two keyframes chord
 * straight through the shoulder — measured worst-case elbow 42.2° at the
 * midpoint — so a third, forward-carried hand keeps the path on the outside
 * of the sweep (worst measured dip 68.1°/79.0°, well clear of the 28° floor).
 */
const WALL_LOW: [number, number] = [178, 92];
const WALL_MID: [number, number] = [196, 62];
const WALL_HIGH: [number, number] = [183, 32];

/**
 * Arm circles. `shoulder_mobility` is `loop: 'pingpong'`, which plays a
 * pattern's keyframes forward then backward — it retraces its own path, so a
 * true 360° circle cannot be expressed here. This is authored as a ~180° arc
 * (five stations, ~45° apart, radius ~40 from the shoulder) sweeping from low
 * near the hip, up through forward and overhead, to overhead-and-behind. It
 * reads as a big circling swing, not a closed circle: ping-pong plays the arc
 * out and swings it back, the way a pendulum does, rather than continuing
 * round. Measured elbow across the five stations: 112.1–120.8° (armR),
 * 116.9–132.5° (armL); worst mid-segment dip 98.8° — no fold.
 */
const CIRCLE_1: [number, number] = [168, 105];
const CIRCLE_2: [number, number] = [194, 89];
const CIRCLE_3: [number, number] = [201, 59];
const CIRCLE_4: [number, number] = [184, 33];
const CIRCLE_5: [number, number] = [155, 27];

/**
 * Cuban rotation. Elbow held low-and-out at E=(175.46,86.88) (measured from
 * armR root (163.46,66.10), 24 units out — the upper-arm length — so the
 * elbow is genuinely fixed, not just close). The forearm rotates about that
 * point: measured joint drift between the two keyframes is 0.06 units on the
 * near arm (175.43,86.90)→(175.49,86.87), 3.3 units on the far arm, against a
 * 22-unit forearm.
 *
 * A literal down-to-up 180° sweep is not reachable with a fixed elbow and one
 * bend sign: a target directly below a fixed elbow and one directly above it
 * always fall on opposite sides of the root–elbow line, which is exactly what
 * `solveLimb`'s bend picks a side of — reaching both would need the bend sign
 * to flip mid-rep, which HANDOFF rules out. So this sweeps the ~110° that one
 * sign actually covers: hand rotates from down-and-in (elbow 110.0°/128.0°
 * R/L) to up-and-in (elbow 40.0°/50.9° R/L), both comfortably clear of the 28°
 * floor, with no fold in between (worst measured 40.1°, at the endpoint
 * itself — monotonic, not a dip).
 */
const CUBAN_DOWN: [number, number] = [197.1, 83.1];
const CUBAN_UP: [number, number] = [179.3, 65.2];

export const shoulderMobility: RigPattern = {
  id: 'shoulder_mobility',
  cycleMs: 2800,
  load: 'upperArm',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  keyframes: [
    { ...base, handR: HAND_LOW, handL: HAND_LOW },
    { ...base, handR: HAND_FORWARD, handL: HAND_FORWARD },
    { ...base, handR: HAND_HIGH, handL: HAND_HIGH },
  ],
  poses: {
    wall: [
      { ...base, handR: WALL_LOW, handL: WALL_LOW },
      { ...base, handR: WALL_MID, handL: WALL_MID },
      { ...base, handR: WALL_HIGH, handL: WALL_HIGH },
    ],
    circles: [
      { ...base, handR: CIRCLE_1, handL: CIRCLE_1 },
      { ...base, handR: CIRCLE_2, handL: CIRCLE_2 },
      { ...base, handR: CIRCLE_3, handL: CIRCLE_3 },
      { ...base, handR: CIRCLE_4, handL: CIRCLE_4 },
      { ...base, handR: CIRCLE_5, handL: CIRCLE_5 },
    ],
    cuban: [
      { ...base, handR: CUBAN_DOWN, handL: CUBAN_DOWN, armBend: [1, 1] as [number, number] },
      { ...base, handR: CUBAN_UP, handL: CUBAN_UP, armBend: [1, 1] as [number, number] },
    ],
  },
};
