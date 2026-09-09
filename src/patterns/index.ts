import type { RigPattern } from '../types';
import { pushupHorizontal } from './pushup-horizontal';
import { pushupKnees } from './pushup-knees';
import { squat } from './squat';
import { plankHold } from './plank-hold';
import { plankForearm } from './plank-forearm';
import { jumpingJack } from './jumping-jack';
import { lunge } from './lunge';
import { bridge } from './bridge';
import { crunch } from './crunch';
import { reverseCrunch } from './reverse-crunch';
import { calfRaise } from './calf-raise';
import { curl } from './curl';
import { overheadPress } from './overhead-press';
import { lateralRaise } from './lateral-raise';
import { proneRaise } from './prone-raise';
import { plankDynamic } from './plank-dynamic';
import { stretchFloor } from './stretch-floor';
import { stretchStanding } from './stretch-standing';
import { hinge } from './hinge';
import { carry } from './carry';
import { shoulderMobility } from './shoulder-mobility';
import { smallJump } from './small-jump';
import { floorPress } from './floor-press';
import { supineFly } from './supine-fly';
import { supineHamstring } from './supine-hamstring';
import { deadBug } from './dead-bug';
import { cossackSquat } from './cossack-squat';
import { lateralLunge } from './lateral-lunge';
import { curtsyLunge } from './curtsy-lunge';
import { sissySquat } from './sissy-squat';
import { seatedCurl } from './seated-curl';
import { seatedCalfRaise } from './seated-calf-raise';
import { bearPlank } from './bear-plank';
import { frontRaise } from './front-raise';
import { sphinxPress } from './sphinx-press';
import { hipThrust } from './hip-thrust';

/**
 * The pattern registry. Keys are the `rig` values in the `posekit/exercises` export.
 * 61 patterns are specified (SPEC-07 §6, plus the nine below). Exercises whose pattern is absent
 * render the SPEC-07 §9 fallback rather than failing, so this grows one pattern
 * at a time. Every addition must pass the form invariants in §5.3.
 */
export const PATTERNS: Record<string, RigPattern> = {
  [pushupHorizontal.id]: pushupHorizontal,
  [pushupKnees.id]: pushupKnees,
  [squat.id]: squat,
  [plankHold.id]: plankHold,
  [plankForearm.id]: plankForearm,
  [jumpingJack.id]: jumpingJack,
  [lunge.id]: lunge,
  [bridge.id]: bridge,
  [crunch.id]: crunch,
  [reverseCrunch.id]: reverseCrunch,
  [calfRaise.id]: calfRaise,
  [curl.id]: curl,
  [overheadPress.id]: overheadPress,
  [lateralRaise.id]: lateralRaise,
  [proneRaise.id]: proneRaise,
  [plankDynamic.id]: plankDynamic,
  [stretchFloor.id]: stretchFloor,
  [stretchStanding.id]: stretchStanding,
  [hinge.id]: hinge,
  [carry.id]: carry,
  [shoulderMobility.id]: shoulderMobility,
  [smallJump.id]: smallJump,
  [floorPress.id]: floorPress,
  [supineFly.id]: supineFly,
  [supineHamstring.id]: supineHamstring,
  [deadBug.id]: deadBug,

  // Batch 4 of the param audit: nine exercises whose `rig_params` named a
  // movement the pattern they sat on could not draw. Each needed a field that
  // lives on the pattern, not on an entry in its `poses` map — a front camera,
  // tucked toes, a seated chain, a non-collinear back — so a named pose could
  // not have carried them. See docs/spec/SPEC-07-param-audit.md, class (c).
  [cossackSquat.id]: cossackSquat,
  [lateralLunge.id]: lateralLunge,
  [curtsyLunge.id]: curtsyLunge,
  [sissySquat.id]: sissySquat,
  [seatedCurl.id]: seatedCurl,
  [seatedCalfRaise.id]: seatedCalfRaise,
  [bearPlank.id]: bearPlank,
  [frontRaise.id]: frontRaise,
  [sphinxPress.id]: sphinxPress,

  // Same class (c) reasoning, one exercise later. Hip thrust carried
  // `elevate: 'shoulders'`, which `applyRigParams` never converted to a rise and
  // which could not select a pose either, so it drew as a plain glute bridge.
  // A shoulder-supported thrust is a different chain, not an offset.
  [hipThrust.id]: hipThrust,
};

export function getPattern(id: string): RigPattern | null {
  return PATTERNS[id] ?? null;
}
