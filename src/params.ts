import type {
  AnimationType,
  RigParams,
  RigPattern,
  RigPose,
  RigProp,
  ResolvedPattern,
  Vec2,
} from './types';
import { BOUNDS, GROUND_Y } from './solve';

/**
 * How far a grip variant moves the hands along the floor.
 *
 * Width variants are all zero on purpose. A side view cannot express how far
 * apart the hands are, and the earlier x-offsets substituted a real fault — the
 * hand planted ahead of the shoulder — for a distinction the camera angle can't
 * show. Wide, narrow and diamond share one animation; the name and the form cues
 * carry the difference. Staggered and archer genuinely are visible side-on.
 */
const HAND_SHIFT: Record<string, number> = {
  wide: 0,
  narrow: 0,
  diamond: 0,
  low: 0,
  staggered: 8,
  archer: 14,
};

const ELEVATE_RISE = 26;
const HOLD_CYCLE_MS = 3400;

/**
 * The params this function consumes itself. They are excluded from pose-name
 * candidacy so that `load: 'hands'` can never select a pose called `hands`.
 */
const HANDLED_PARAMS = new Set([
  'pose',
  'shape',
  'move',
  'hands',
  'elevate',
  'range',
  'hold',
  'tempo',
  'single',
  'load',
  'implement',
]);

/** Order-preserving combinations of `size` items, so names stay alphabetical. */
function combinations(items: string[], size: number): string[][] {
  if (size === 0) return [[]];
  if (size > items.length) return [];
  const [head, ...rest] = items;
  return [
    ...combinations(rest, size - 1).map((c) => [head, ...c]),
    ...combinations(rest, size),
  ];
}

const camelJoin = (parts: string[]) =>
  parts
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');

/**
 * Which named pose set a row asks for.
 *
 * `pose`, `shape` and `move` are the explicit selector, but the seed data names
 * most variants with their own key instead — `vup: true`, `direction: 'curtsy'`,
 * `style: 'pogo'`. Those parsed cleanly and did nothing, so 63 exercises drew as
 * 19 distinct animations. Every param key is now a candidate pose name: a `true`
 * boolean contributes its key, a string contributes its value.
 *
 * Refinements are tried before the explicit selector, because that is what they
 * are — a swimmer is `{ shape: 'superman', alternate: true }`, and resolving it
 * to `superman` is exactly the collision this exists to break. Where two keys
 * refine together, their tokens are tried joined in alphabetical key order
 * first: jackknife is `{ vup, alternate }` and wants `alternateVup`, not the
 * plain `vup` that is a V-up.
 *
 * Every candidate is checked against the pattern's own `poses` map, so a key
 * with no pose authored for it stays the no-op it is today.
 */
function selectPoses(pattern: RigPattern, params: RigParams): RigPose[] | null {
  const poses = pattern.poses;
  if (!poses) return null;

  const refinements = Object.keys(params)
    .filter((k) => !HANDLED_PARAMS.has(k))
    .sort()
    .map((k) => (params[k] === true ? k : typeof params[k] === 'string' ? (params[k] as string) : null))
    .filter((t): t is string => t !== null);

  // Every combination, most specific first, so a two-key refinement of a
  // three-key row is still reachable. Going straight from the full join to the
  // singles skipped the middle: `{ a, b, c }` never tried `ab`. No seed row
  // carries three refinements today, which is exactly why it would have sat
  // there until one did.
  const candidates: string[] = [];
  for (let size = refinements.length; size >= 1; size -= 1) {
    for (const combo of combinations(refinements, size)) candidates.push(camelJoin(combo));
  }
  for (const key of ['pose', 'shape', 'move'] as const) {
    const v = params[key];
    if (typeof v === 'string') candidates.push(v);
  }

  for (const name of candidates) {
    if (poses[name]) return poses[name];
  }
  return null;
}

const shift = (p: Vec2, dx: number, dy: number): Vec2 => [p[0] + dx, p[1] + dy];

/** A support surface under a contact point, running down to the ground. */
function blockUnder(x: number, y: number, w = 46): RigProp {
  const top = y + 6;
  // Kept on-canvas: a support block sliced off by the viewBox edge reads as a
  // rendering bug rather than as furniture.
  const left = Math.min(Math.max(x - w / 2, BOUNDS.minX - 6), BOUNDS.maxX + 6 - w);
  return { x: left, y: top, w, h: Math.max(6, GROUND_Y - top) };
}

/**
 * The two named ranges the patterns were authored against. They are kept as
 * exact constants because every existing pattern was eyeballed at these values;
 * a caller passing `0.45` gets a byte-identical pose to one passing `'pulse'`.
 */
export const RANGE_PRESETS = { pulse: 0.45, full: 1.15 } as const;

/**
 * How far through its range the movement travels, as a multiplier on every
 * joint's offset from the start pose. `1` is the pattern as authored, `0.5` is
 * half depth, `0` never leaves the start position.
 *
 * This is the parameter a pre-rendered animation cannot have: a clinician
 * prescribing "squat to about sixty percent, no deeper" needs 0.6, not a choice
 * between two presets someone else picked.
 *
 * Returns `null` when no range was asked for, so the caller can skip the
 * transform entirely rather than paying for a no-op pass over the keyframes.
 *
 * Values above ~1.2 are accepted but push the solver toward its reach limits,
 * where a limb clamps straight rather than extending further — see the
 * over-reach note in `solve.ts`. The bundled form tests sweep 0 to 1.2.
 */
export function resolveRange(range: unknown): number | null {
  if (typeof range === 'number') {
    if (!Number.isFinite(range) || range < 0) return null;
    return range;
  }
  if (range === 'pulse') return RANGE_PRESETS.pulse;
  if (range === 'full') return RANGE_PRESETS.full;
  return null;
}

/** Scale keyframe n's offset from keyframe 0, for shortened or extended ranges. */
function scaleFromBase(base: RigPose, target: RigPose, k: number): RigPose {
  const s2 = (a: Vec2, b: Vec2): Vec2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const s1 = (a: number, b: number) => a + (b - a) * k;
  return {
    hip: s2(base.hip, target.hip),
    torsoAngle: s1(base.torsoAngle, target.torsoAngle),
    headTilt: s1(base.headTilt, target.headTilt),
    handR: s2(base.handR, target.handR),
    handL: s2(base.handL, target.handL),
    footR: s2(base.footR, target.footR),
    footL: s2(base.footL, target.footL),
    armBend: target.armBend,
    legBend: target.legBend,
  };
}

/**
 * The static-hold breathing drift from SPEC-07 §6.1.
 *
 * Moves the hip *along* the torso axis rather than straight down. A downward
 * translation drives load-bearing joints through the floor on a prone hold —
 * a forearm plank's elbow ended up 4 units under the ground line.
 */
function breathe(pose: RigPose): RigPose {
  const t = (pose.torsoAngle * Math.PI) / 180;
  return {
    ...pose,
    hip: shift(pose.hip, Math.cos(t) * 1.5, Math.sin(t) * 1.5),
    torsoAngle: pose.torsoAngle - 1,
  };
}

/**
 * Folds a row's rig_params into its pattern.
 *
 * Anything that moves a contact point goes through the pattern's own `derive`,
 * which re-solves the body from that contact. Translating a contact directly is
 * what folded an incline push-up's elbow shut to an impossible 6°.
 *
 * An unknown or malformed param resolves to a no-op and never throws, so a data
 * typo degrades to the base pattern instead of a blank screen.
 */
export function applyRigParams(
  pattern: RigPattern,
  params: RigParams = {},
  animationType?: AnimationType,
): ResolvedPattern {
  let frames = pattern.keyframes.map((f) => ({ ...f }));
  let cycleMs = pattern.cycleMs;
  let ease = pattern.ease;
  const props: RigProp[] = pattern.props ? [...pattern.props] : [];
  let hideFarArm = false;
  let hideFarLeg = false;
  let heldLoad: 'hands' | 'front' | 'back' | null = null;
  let implement: 'pack' | 'jug' | 'bottle' = 'pack';

  // Which variant of this pattern to show. Replaces the base keyframes outright,
  // before any other transform. An unrecognised name falls back to the base
  // rather than throwing, so a typo degrades to a generic pose, not a blank card.
  const selected = selectPoses(pattern, params);
  if (selected) frames = selected.map((f) => ({ ...f }));

  const hands = params.hands;
  const handShift = typeof hands === 'string' ? (HAND_SHIFT[hands] ?? 0) : 0;
  const elevate = params.elevate;
  const handRise = elevate === 'hands' ? ELEVATE_RISE : 0;
  const footRise = elevate === 'feet' ? ELEVATE_RISE : 0;

  if (handShift || handRise || footRise) {
    if (pattern.derive) {
      frames = pattern.derive({ handRise, footRise, handShift, frames }).map((f) => ({ ...f }));
      if (handRise || footRise) {
        const near = handRise ? frames[0].handR : frames[0].footR;
        const far = handRise ? frames[0].handL : frames[0].footL;
        props.push(blockUnder((near[0] + far[0]) / 2, Math.min(near[1], far[1])));
      }
    }
    // Patterns without a derivation stay as authored. Showing the flat version of
    // an incline push-up is wrong; showing an impossible one is worse.
  }

  const rangeK = resolveRange(params.range);
  // Exactly 1 is the pattern as authored, and is skipped rather than scaled by
  // one: `a + (b - a) * 1` is not bit-identical to `b` in floating point, so
  // passing `range: 1` would otherwise shift every joint by a rounding error
  // relative to passing no range at all.
  if (rangeK !== null && rangeK !== 1 && frames.length > 1) {
    const base = frames[0];
    frames = [base, ...frames.slice(1).map((f) => scaleFromBase(base, f, rangeK))];
  }

  // `animation_type` is the column that says an exercise is measured in seconds
  // in one position, and until now no code read it: 30 rows were typed `'hold'`
  // without also carrying `rig_params.hold`, so they animated a full rep. Most
  // were harmless — their pattern is already a static breathing hold — but a
  // hollow body hold ran the whole crunch, a superman the whole prone raise, and
  // a plate pinch walked like a farmer's carry. Deriving it here rather than
  // adding `hold: true` to those rows keeps one source of truth: two columns
  // that can disagree about whether a movement is a hold is the fault waiting to
  // happen. An explicit `rig_params.hold` still wins, in either direction.
  const held = params.hold === undefined ? animationType === 'hold' : params.hold === true;

  if (held) {
    // The LAST keyframe, not the first: a wall sit holds the bottom of a squat.
    // Collapsing to keyframe 0 drew it standing upright.
    const working = frames[frames.length - 1];
    frames = [working, breathe(working)];
    cycleMs = HOLD_CYCLE_MS;
    ease = undefined;
  } else if (params.tempo === 'explosive') {
    // Only meaningful for a moving pattern; a hold has no tempo.
    cycleMs = Math.round(cycleMs * 0.55);
    ease = 'explosive';
  }

  if (params.single === true) {
    // Declared per pattern. Inferring it from the load bone silently did nothing
    // for anything loaded at the torso, e.g. a single-arm carry.
    if (pattern.unilateral === 'arm') hideFarArm = true;
    else if (pattern.unilateral === 'leg') hideFarLeg = true;
  }

  if (params.load === 'hands' || params.load === 'front' || params.load === 'back') {
    heldLoad = params.load;
  }
  if (params.implement === 'pack' || params.implement === 'jug' || params.implement === 'bottle') {
    implement = params.implement;
  }

  // `seated` and `elevate: 'shoulders'` change the kinematic chain itself, so no
  // offset here expresses them and both remain no-ops. Neither appears in the
  // seed data any more: their exercises moved to patterns carrying dedicated
  // keyframes — `seated_curl` and `seated_calf_raise` in batch 4, `hip_thrust`
  // after them. The SPEC-07 §6.2 rule they existed to flag still stands for any
  // future row: an exercise needing a chain this cannot draw must not be mapped
  // to a pattern that depicts a different movement.
  //
  // A second group is deliberately and permanently no-op, because the camera
  // cannot express it: `grip`, `towel`, `fingertip`, `squeeze`, `pinch` and
  // `cross`. Same reasoning as HAND_SHIFT's width variants above — the name and
  // the form cues carry the difference. See docs/spec/SPEC-07-param-audit.md for
  // the classification of every key in the seed data.
  //
  // Everything else now resolves through `selectPoses`: a param becomes live the
  // moment its pattern authors a pose of that name, and stays a no-op until then.

  return {
    ...pattern,
    keyframes: frames,
    cycleMs,
    ease,
    props,
    hideFarArm,
    hideFarLeg,
    heldLoad,
    implement,
  };
}
