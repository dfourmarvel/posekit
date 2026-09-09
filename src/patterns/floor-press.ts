import type { RigPattern, RigPose } from '../types';

/**
 * Carries 3 exercises: floor press, pillow squeeze press, Tate press.
 *
 * Supine with the head to the RIGHT, knees bent and feet planted to the left.
 * The press travels straight up from the chest; the elbow drops toward the feet
 * rather than toward the head, which is what stops it reading as a shrug.
 */
const FOOT: [number, number] = [120, 170];

/**
 * Tate press: same hip/torso/foot as the base pattern — only the elbow position
 * and the hand's bottom contact change. Flipping the bend to +1 (base uses -1)
 * moves the elbow joint to x=195.0/204.4 against a shoulder root at x=194.0, so
 * it stays level with or beyond the shoulder toward the head, instead of the
 * base's tucked -1 bend, which puts the joint at x=174.4 — toward the feet.
 * That reads as the elbows staying wide instead of tucking to the ribs.
 *
 * The hand travels down to [178, 150], near the sternum, instead of the base's
 * straight-up path to [196, 142]/[196, 118]. Measured: elbow 48.2°/43.3° (R/L)
 * at the sternum contact and 132.1°/111.6° at full extension, both clear of the
 * 28° floor; reach off the shoulder root is 18.9/17.1 and 42.1/38.1, both well
 * inside the 46-unit arm span.
 */
const TATE_BOTTOM: RigPose = {
  hip: [152, 158], torsoAngle: 0, headTilt: 0,
  handR: [178, 150], handL: [178, 150],
  footR: FOOT, footL: FOOT,
  armBend: [1, 1], legBend: [1, 1],
};
const TATE_TOP: RigPose = {
  hip: [152, 158], torsoAngle: 0, headTilt: 0,
  handR: [196, 118], handL: [196, 118],
  footR: FOOT, footL: FOOT,
  armBend: [1, 1], legBend: [1, 1],
};

export const floorPress: RigPattern = {
  id: 'floor_press',
  cycleMs: 2200,
  load: 'upperArm',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'arm',
  keyframes: [
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [196, 142], handL: [196, 142],
      footR: FOOT, footL: FOOT,
      armBend: [-1, -1], legBend: [1, 1],
    },
    {
      hip: [152, 158], torsoAngle: 0, headTilt: 0,
      handR: [196, 118], handL: [196, 118],
      footR: FOOT, footL: FOOT,
      armBend: [-1, -1], legBend: [1, 1],
    },
  ],
  poses: {
    tate: [TATE_BOTTOM, TATE_TOP],
  },
};
