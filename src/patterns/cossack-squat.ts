import type { RigPattern } from '../types';

/**
 * The first genuinely asymmetric frontal-plane squat: the figure sinks over
 * one hip while the other leg stays extended out to the side, so it cannot be
 * a mirrored front-view pose — see SPEC-07-param-audit.md D2. Declares
 * `symmetry: 'free'` to opt out of the front-view midline-mirror invariant,
 * which is right for a jumping jack and wrong here by definition.
 *
 * Feet are fixed across both keyframes, same as `squat`: a Cossack squat is a
 * static wide stance, not a step. Only the hip travels, sinking down and
 * toward the bent leg.
 *
 * The wide top stance isn't standing at full height either — a straight leg
 * has a fixed 62-unit reach, and spending some of that reach on width leaves
 * less for depth, so the hip sits a bit lower than a narrow stance's 108 even
 * with both knees close to locked. That's the geometry of a wide stance, not
 * an authoring choice.
 *
 * The hands are authored as a fixed offset from their OWN shoulder root, not
 * as a fixed point in screen space, so "together in front of the chest"
 * translates with the torso between keyframes instead of staying put while
 * the shoulder moves out from under it. The first version anchored both
 * keyframes' hands to the same on-screen point; the shoulder travels roughly
 * diagonally between them while the hand travelled a different line, and the
 * chord between the two hand keyframes swept within a few units of the
 * shoulder at mid-cycle, folding the elbow to 10.5°. A constant per-shoulder
 * offset can't do that — the arm's shape, and its elbow angle, never changes.
 */
export const cossackSquat: RigPattern = {
  id: 'cossack_squat',
  cycleMs: 2600,
  load: 'thigh',
  footDir: 1,
  view: 'front',
  loop: 'pingpong',
  unilateral: 'leg',
  symmetry: 'free',
  keyframes: [
    {
      hip: [160, 115],
      torsoAngle: -90,
      headTilt: 0,
      handR: [160, 93],
      handL: [160, 93],
      footR: [194, 170],
      footL: [126, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
    {
      // Sunk over the right leg: hip drops and travels toward footR, whose
      // short reach from the new hip position is what bends that knee deeply.
      // footL's reach barely shrinks from the top pose, so it stays near its
      // 62-unit span — a straight leg, not an authored one.
      hip: [188, 145],
      torsoAngle: -90,
      headTilt: 0,
      handR: [188, 123],
      handL: [188, 123],
      footR: [194, 170],
      footL: [126, 170],
      armBend: [-1, 1],
      legBend: [-1, 1],
    },
  ],
};
