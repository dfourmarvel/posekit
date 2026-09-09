import type { RigPattern, RigPose } from '../types';
import { GROUND_Y, pressKeyframes, straightBodyPose } from '../solve';

const TOE_X = 92;
const ANKLE_LIFT = 9;
const TOP_REACH = 45.5;

/** A high plank whose straight body line is solved from its hand and toe contacts. */
function highPlank(handRise = 0, footRise = 0, handShift = 0): RigPose {
  return pressKeyframes({
    toeX: TOE_X,
    handY: GROUND_Y - handRise,
    ankleY: GROUND_Y - ANKLE_LIFT - footRise,
    topReach: TOP_REACH,
    bottomReach: TOP_REACH,
    handShift,
    headTilt: 12,
  })[0];
}

function armMotion(handR: RigPose['handR']): RigPose[] {
  const base = highPlank();
  return [base, { ...base, handR }];
}

function climberFrames(handRise = 0, footRise = 0, handShift = 0): RigPose[] {
  const base = highPlank(handRise, footRise, handShift);
  return [
    base,
    {
      ...base,
      // The near knee drives forward under the trunk; the far leg remains the
      // planted support. Both bend signs stay fixed through the entire cycle.
      footR: [base.hip[0] + 7, base.footR[1]],
    },
  ];
}

function bodySaw(toeX: number, headTilt = 10): RigPose {
  return straightBodyPose({
    toeX,
    bodyAngle: 9.13,
    hand: [216.7, 170.5],
    ankleLift: ANKLE_LIFT,
    headTilt,
    armBend: 1,
  });
}

/**
 * Dynamic plank work. Each movement keeps the supporting body line derived
 * from its contacts; only the working arm, driven knee, or sliding toe moves.
 */
// Reach and saw travel is held slightly short of the frame edge: `range: 'full'`
// scales a pose's delta by 1.15, and at full extension the reaching hand and the
// sliding body both ran a fraction past the viewBox.
export const plankDynamic: RigPattern = {
  id: 'plank_dynamic',
  cycleMs: 1800,
  load: 'torso',
  footDir: -1,
  view: 'side',
  loop: 'pingpong',
  toe: 'tucked',
  keyframes: climberFrames(),
  poses: {
    tap: armMotion([207, 133]),
    reach: armMotion([222, 123]),
    saw: [bodySaw(92), bodySaw(100, 12)],
    climb: climberFrames(),
  },
  // Ignores the frames it is given and always returns a climber, which is right
  // for the one row that uses it (elevated mountain climbers) and a trap for any
  // future one: a row pairing `elevate` with `saw` or `tap` would silently come
  // back a climber. `derive` now receives the frames in play precisely so that
  // case can be handled — re-derive from those rather than from nothing.
  derive: ({ handRise, footRise, handShift }) => climberFrames(handRise, footRise, handShift),
  // SPEC-GAP: `cross` has no RigPattern selector or transform in
  // applyRigParams. The cross-body climber falls back to the standard climber
  // rather than pretending a side view can show an unimplemented cross path.
};
