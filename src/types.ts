/** A point in rig space. SVG conventions: x grows right, y grows down. */
export type Vec2 = readonly [number, number];

/**
 * Elbow/knee bend direction: +1 rotates the joint clockwise in screen space
 * from the root→target line, -1 anticlockwise. Authored keyframes always use
 * ±1, but interpolation passes through intermediate values (0 = straight
 * limb), so poses carry plain numbers.
 */
export type BendPair = readonly [number, number];

export type RigPose = {
  hip: Vec2;
  /** Absolute degrees. 0 points right, -90 points up. */
  torsoAngle: number;
  /** Added to torsoAngle to place the head. */
  headTilt: number;
  handR: Vec2;
  handL: Vec2;
  footR: Vec2;
  footL: Vec2;
  armBend: BendPair;
  legBend: BendPair;
};

export type LoadBone = 'torso' | 'upperArm' | 'foreArm' | 'thigh' | 'shin' | 'none';
/** `tucked` = on the balls of the feet, for prone work. `flat` = sole down. */
export type ToeMode = 'flat' | 'tucked';
export type RigView = 'side' | 'front';
export type RigLoop = 'pingpong' | 'cycle';
export type RigEase = 'cosine' | 'explosive';
/** The `animation_type` column of a library row. `hold` means the exercise is
 *  measured in seconds in a fixed position, not in reps. */
export type AnimationType = 'rep' | 'hold' | 'timed';

/** A surface the figure rests on, or an object it holds. Flat rounded rect. */
export type RigProp = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RigPattern = {
  id: string;
  /** 1 = static hold, 2 = ping-pong rep, 3+ = a sequence. */
  keyframes: RigPose[];
  cycleMs: number;
  load: LoadBone;
  /** Which way the foot segment points: 1 forward, -1 backwards (toes tucked). */
  footDir: 1 | -1;
  view: RigView;
  loop: RigLoop;
  ease?: RigEase;
  props?: RigProp[];
  toe?: ToeMode;
  /** Named alternative keyframe sets, selected by `rig_params.pose`. A stretch
   *  pattern is really a library of static poses sharing one body position; this
   *  is how 13 floor stretches live on one pattern without all rendering alike. */
  poses?: Record<string, RigPose[]>;
  /** Re-derives the keyframes for moved contacts. Patterns that supply this get
   *  correct incline/decline/grip variants; those that don't fall back to the
   *  base pose rather than to a broken one.
   *
   *  `frames` is what the pattern is showing at that point — the base keyframes,
   *  or the entry `poses` selected, since selection happens first. A pattern
   *  that solves its whole body from the contacts (a press) can ignore it; one
   *  that transforms the pose it was given (a supine chain) must use it, or a
   *  couch hamstring curl loses the `curl` pose on its way through here. */
  derive?: (o: {
    handRise: number;
    footRise: number;
    handShift: number;
    frames: RigPose[];
  }) => RigPose[];
  /** Which limb pair `single: true` reduces to. Inferring it from `load` silently
   *  did nothing for patterns loaded at the torso. */
  unilateral?: 'arm' | 'leg';
  /** Front-view patterns are asserted to mirror about x = 160, which catches a
   *  front pattern authored with side-view coordinates. Movements that are
   *  asymmetric by definition — a Cossack squat, a lateral lunge — declare
   *  `'free'` to opt out. Declaring it is deliberate and reviewable; weakening
   *  the invariant for everyone would not be. Ignored for `view: 'side'`. */
  symmetry?: 'mirrored' | 'free';
};

export type RigParams = Record<string, unknown>;

/**
 * Everything hard-coded about the figure's build: bone lengths, stroke
 * widths, and the near/far limb offset per view. `DEFAULT_PROPORTIONS` (in
 * lib/rig/solve) holds today's values; passing a different set renders the
 * same pattern on a different body.
 */
export type Proportions = {
  upperArm: number;
  foreArm: number;
  thigh: number;
  shin: number;
  torso: number;
  neck: number;
  headR: number;
  hand: number;
  foot: number;
  width: { torso: number; arm: number; leg: number; hand: number; foot: number };
  halfWidth: { side: number; front: number };
};

/** A pattern with per-exercise params folded in. What the renderer consumes. */
export type ResolvedPattern = RigPattern & {
  props: RigProp[];
  hideFarArm: boolean;
  hideFarLeg: boolean;
  /** Where a held implement is drawn: in the hands, at the chest, or on the back. */
  heldLoad: 'hands' | 'front' | 'back' | null;
  /** What the figure is gripping, so a backpack curl does not draw a jug. */
  implement: 'pack' | 'jug' | 'bottle';
};
