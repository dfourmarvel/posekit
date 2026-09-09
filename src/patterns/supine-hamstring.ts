import type { RigPattern, RigPose } from '../types';
import { raiseFootContact } from '../solve';

/**
 * Carries 3 exercises: hamstring walkout, sliding leg curl, couch hamstring curl.
 *
 * The hips stay lifted throughout, which is the hard part of both movements,
 * while the heels travel along the floor. Knees bend toward the ceiling.
 *
 * The two are near-mirrors of one another and the data distinguishes them with
 * `move`, so they are authored as named poses rather than one shared animation:
 * a walkout drives the heels *away* from a bent-knee bridge until the legs are
 * nearly straight; a curl starts extended and drags them *back in* to deep knee
 * flexion. Without the distinction all three exercises animated identically.
 */
const HAND: [number, number] = [145, 170];

/** Hips lifted, torso on the same line in every frame. Only the heels move. */
function pose(footX: number, footY: number): RigPose {
  const foot: [number, number] = [footX, footY];
  return {
    hip: [152, 150],
    torsoAngle: 10,
    headTilt: -12,
    handR: HAND,
    handL: HAND,
    footR: foot,
    footL: foot,
    armBend: [-1, -1],
    legBend: [1, 1],
  };
}

// Hip-to-heel distances, against a 62-unit leg. Anything past that clamps and
// floats the foot off the floor, so both ranges stop short of full extension.
const BENT = pose(124, 170); // 34.4 — bridge start
const DEEP = pose(131, 170); // 29.0 — the bottom of a curl
const LONG = pose(100, 168); // 55.0 — walked out, knees nearly locked
const EXTENDED = pose(103, 169); // 52.3 — where a curl begins

export const supineHamstring: RigPattern = {
  id: 'supine_hamstring',
  cycleMs: 2800,
  load: 'thigh',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  unilateral: 'leg',
  keyframes: [BENT, LONG],
  // Couch hamstring curl is `{ move: 'curl', elevate: 'feet' }`, and until this
  // existed the `elevate` half was inert: it drew as the sliding leg curl. The
  // heels go up onto the couch and the hip is re-solved from them, the shoulders
  // staying on the floor. It runs over `frames`, not over the base keyframes,
  // because pose selection happens first — deriving from the base would throw the
  // `curl` pose away and hand back a walkout.
  derive: ({ footRise, frames }) => frames.map((f) => raiseFootContact(f, footRise)),
  poses: {
    walkout: [BENT, LONG],
    curl: [EXTENDED, DEEP],
  },
};
