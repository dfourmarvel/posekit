import type { RigPattern } from '../types';

/**
 * Distinct from `cossack_squat` in exactly one structural way: this pattern
 * starts from the ordinary narrow standing stance (feet together, keyframe 0
 * matches the shared front-view base pose) and only the stepping foot
 * travels. A Cossack squat starts already wide and rocks the sink between two
 * planted feet; this steps out from neutral. `symmetry: 'free'` for the same
 * reason as the Cossack — the bottom is asymmetric by definition, one leg
 * bent and loaded, the other still near its start position.
 *
 * The trailing arm/shoulder pair simply translates with the hip between
 * keyframes (the hand's offset from the shoulder is identical in both
 * keyframes), so the arms never re-bend during the rep — passive at the
 * sides, not part of the movement, and nothing for the elbow-sweep check to
 * catch.
 *
 * The hip and stepping leg (footR) are untouched from the original, already-
 * correct authoring — only the trailing foot (footL) moves further out, from
 * x = 154 to x = 129, which is what opens its reach from the (unmoved) hip
 * root toward the leg's 62-unit span. The previous footL left that reach at
 * 41.7, a right-angle 84.6° knee that read as a second squatting leg rather
 * than a stretched one. Measured on the fix: trailing-leg reach 61.8,
 * trailing knee 170.2° (stepping knee unchanged at 58.8°, well under 90).
 */
export const lateralLunge: RigPattern = {
  id: 'lateral_lunge',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'front',
  loop: 'pingpong',
  unilateral: 'leg',
  symmetry: 'free',
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
      // footR (right) is the leg that steps out and loads; footL (trailing)
      // opens out to the left so its reach approaches straight. Both feet
      // share y = 170 — previously footR sat at 168, a stray 2-unit mismatch.
      hip: [190, 140],
      torsoAngle: -90,
      headTilt: 0,
      handR: [204, 143],
      handL: [176, 143],
      footR: [202, 170],
      footL: [129, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
  ],
};
