import type { RigPattern } from '../types';
import { straightBodyPose } from '../solve';

/**
 * Forearm plank — its own pattern rather than a `support: 'forearm'` flag on the
 * hand-supported plank. That flag was a no-op, so the forearm plank rendered as a
 * straight-arm plank: a different exercise under the right name.
 *
 * The elbow lands on the floor under the shoulder and the forearm lies flat
 * along it, which the IK produces exactly, since shoulder-to-elbow is the upper
 * arm's length and elbow-to-hand is the forearm's.
 */
export const plankForearm: RigPattern = {
  id: 'plank_forearm',
  cycleMs: 3400,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  // The body angle is identical in both keyframes and the drift is carried by the
  // head alone: the elbow is a load-bearing contact here, so rocking the body
  // even half a degree pushes it through the floor.
  keyframes: [
    straightBodyPose({ toeX: 92, bodyAngle: 9.13, hand: [216.7, 170.5], headTilt: 10, armBend: 1 }),
    straightBodyPose({ toeX: 92, bodyAngle: 9.13, hand: [216.7, 170.5], headTilt: 13, armBend: 1 }),
  ],
};
