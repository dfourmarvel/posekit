/**
 * posekit — procedural 2D figure animation.
 *
 * The pipeline is four pure steps, and every one of them is exported so you can
 * stop at whichever stage you need:
 *
 *   applyRigParams(pattern, params)  →  ResolvedPattern   (variant + range + load)
 *   poseAt(resolved, elapsedMs)      →  RigPose           (joint targets at a moment)
 *   buildSkeleton(pose)              →  Skeleton          (IK-solved limbs)
 *   figureGeometry(skeleton)         →  FigureGeometry    (drawable primitives)
 *   toSVG(geometry)                  →  string            (a complete <svg> document)
 *
 * Nothing here touches the DOM, so it runs in Node, a worker, or a browser.
 * The React binding lives in `posekit/react` and is entirely optional.
 */

export type {
  AnimationType,
  BendPair,
  LoadBone,
  Proportions,
  ResolvedPattern,
  RigEase,
  RigLoop,
  RigParams,
  RigPattern,
  RigPose,
  RigProp,
  RigView,
  ToeMode,
  Vec2,
} from './types';

// Geometry constants and the solver.
export {
  BOUNDS,
  DEFAULT_PROPORTIONS,
  GROUND_Y,
  RIG,
  VIEW_BOX,
  buildSkeleton,
  halfWidth,
  hipFromContacts,
  pressKeyframes,
  raiseFootContact,
  skeletonPoints,
  solveLimb,
  straightBodyPose,
  type Limb,
  type Skeleton,
} from './solve';

// Drawable primitives and bounds.
export {
  OUTLINE,
  bonePts,
  eyePositions,
  figureBounds,
  figureGeometry,
  limbPts,
  loadBonePts,
  skeletonBounds,
  tipPts,
  viewBoxOf,
  type Box,
  type FigureGeometry,
  type HeldImplement,
} from './draw';

// Timing.
export { lerpPose, poseAt } from './pose';

// Parameterisation — the range/tempo/load layer.
export { RANGE_PRESETS, applyRigParams, resolveRange } from './params';

// The bundled movement patterns.
export { PATTERNS, getPattern } from './patterns';

// Framework-neutral rendering.
export { toSVG, type RenderOptions } from './render';
