import type { RigPattern, RigPose } from '../types';

const HIP: [number, number] = [160, 108];
const FOOT_R: [number, number] = [164, 170];
const FOOT_L: [number, number] = [155, 170];

/**
 * Arnold press: starts with the hands in front of the chest (elbows forward)
 * instead of the base pattern's hands-at-shoulder-height start, then presses
 * to the same overhead lockout — the rotation itself doesn't read side-on, so
 * the different start is what carries it.
 *
 * The chest-to-overhead swing is 146.6° around the near arm's own root (65.8°
 * to -80.7°), well past the ~50°
 * a single hop tolerates (the lateral-raise trap), so it's staged as two
 * intermediate keyframes at roughly even angle and reach steps from the
 * shoulder root instead of one straight hand path. Measured elbow across the
 * four keyframes: 83.3°/90.0° (start) → 95.0°/97.3° → 108.2°/105.0° →
 * 124.0°/113.6° (top, matching the base pattern's own lockout) — monotonic, no
 * dip. Worst elbow sampled across the whole interpolated cycle: 78.7°, clear
 * of the 28° floor.
 */
const ARNOLD_START: RigPose = {
  hip: HIP, torsoAngle: -88, headTilt: -2,
  handR: [176, 94], handL: [172, 96],
  footR: FOOT_R, footL: FOOT_L,
  armBend: [1, 1], legBend: [-1, -1],
};
const ARNOLD_MID1: RigPose = {
  hip: HIP, torsoAngle: -88, headTilt: -2,
  handR: [195.92, 75.99], handL: [192.29, 76.72],
  footR: FOOT_R, footL: FOOT_L,
  armBend: [1, 1], legBend: [-1, -1],
};
const ARNOLD_MID2: RigPose = {
  hip: HIP, torsoAngle: -88, headTilt: -2,
  handR: [195.12, 46.4], handL: [190.76, 47.12],
  footR: FOOT_R, footL: FOOT_L,
  armBend: [1, 1], legBend: [-1, -1],
};
const ARNOLD_TOP: RigPose = {
  hip: HIP, torsoAngle: -88, headTilt: -2,
  handR: [170, 26], handL: [166, 28],
  footR: FOOT_R, footL: FOOT_L,
  armBend: [1, 1], legBend: [-1, -1],
};

/**
 * Carries the standing overhead press and the Arnold press.
 *
 * Side view: the hands start at shoulder height with the elbows down, then
 * travel overhead. Both arms press together rather than mirroring, for the same
 * reason as the curl.
 */
export const overheadPress: RigPattern = {
  id: 'overhead_press',
  cycleMs: 2400,
  load: 'upperArm',
  footDir: 1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'arm',
  keyframes: [
    {
      hip: HIP,
      torsoAngle: -88,
      headTilt: -2,
      handR: [180, 72],
      handL: [176, 74],
      footR: FOOT_R,
      footL: FOOT_L,
      armBend: [1, 1],
      legBend: [-1, -1],
    },
    {
      hip: HIP,
      torsoAngle: -88,
      headTilt: -2,
      handR: [170, 26],
      handL: [166, 28],
      footR: FOOT_R,
      footL: FOOT_L,
      armBend: [1, 1],
      legBend: [-1, -1],
    },
  ],
  poses: {
    rotate: [ARNOLD_START, ARNOLD_MID1, ARNOLD_MID2, ARNOLD_TOP],
  },
};
