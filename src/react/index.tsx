'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { AnimationType, Proportions, RigParams, RigPose, ResolvedPattern } from '../types';
import {
  OUTLINE,
  figureBounds,
  figureGeometry,
  viewBoxOf,
  type Box,
} from '../draw';
import { applyRigParams } from '../params';
import { getPattern } from '../patterns';
import { poseAt } from '../pose';
import { DEFAULT_PROPORTIONS, GROUND_Y } from '../solve';
import {
  BONE_FILL,
  EYE_R,
  FAR_OPACITY,
  figureLayers,
  paletteVar,
  type Palette,
} from '../render';

const NS = 'http://www.w3.org/2000/svg';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const readReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
// The server cannot know the user's preference; assume motion is fine and let
// the client correct it on hydration.
const reducedMotionOnServer = () => false;

/**
 * A page listing every exercise would otherwise run one animation loop per row.
 * Figures that cannot claim a slot render their first frame statically rather
 * than animating — visible, just still.
 */
const MAX_CONCURRENT_LOOPS = 12;
let activeLoops = 0;

type Parts = {
  outline: Record<string, SVGPolylineElement>;
  outlineHead: SVGCircleElement;
  fill: Record<string, SVGPolylineElement>;
  load: SVGPolylineElement | null;
  head: SVGCircleElement;
  eyes: SVGCircleElement[];
  held: SVGRectElement | null;
  weights: SVGElement[];
  straps: SVGPolylineElement[];
};

export type ExerciseFigureProps = {
  /** A key from `PATTERNS`, e.g. `"squat"`. */
  pattern: string;
  /** Passed straight to `applyRigParams` — `range`, `load`, `hands`, and so on. */
  params?: RigParams;
  /**
   * Whether the movement reps or holds one position. A held exercise freezes on
   * its working keyframe instead of animating a full rep.
   */
  animationType?: AnimationType;
  /** Accessible label. Omit to hide the figure from assistive technology. */
  label?: string;
  playing?: boolean;
  /** Drop the amber load band — advisable below about 80px wide. */
  hideLoad?: boolean;
  palette?: Palette;
  proportions?: Proportions;
  width?: number | string;
  height?: number | string;
  className?: string;
  /** Bypass the concurrent-loop budget. For a gallery that must animate everything. */
  budgetExempt?: boolean;
  /** Force the reduced-motion path without changing OS settings. */
  forceReducedMotion?: boolean;
};

function line(
  parent: SVGGElement,
  stroke: string,
  width: number,
  opacity?: number,
): SVGPolylineElement {
  const el = document.createElementNS(NS, 'polyline');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', stroke);
  el.setAttribute('stroke-width', String(width));
  // Round caps and joins are what produce the soft capsule limbs — no gradient
  // is involved anywhere in this figure.
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  if (opacity !== undefined) el.setAttribute('opacity', String(opacity));
  parent.appendChild(el);
  return el;
}

function propRect(parent: SVGGElement, fill: string, stroke: string | null): SVGRectElement {
  const rect = document.createElementNS(NS, 'rect');
  rect.setAttribute('rx', '4');
  rect.setAttribute('fill', fill);
  if (stroke) {
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', '2');
  }
  parent.appendChild(rect);
  return rect;
}

/**
 * Build the element tree once. Two passes — one silhouette outline, then the
 * coloured fills — so no internal seams show where limbs meet.
 *
 * The layer order comes from `figureLayers`, the same function the string
 * renderer uses, so the two outputs cannot drift apart.
 */
function build(
  root: SVGGElement,
  r: ResolvedPattern,
  proportions: Proportions,
  box: Box,
  palette: Palette,
  hideLoad: boolean,
  ground: boolean,
): Parts {
  while (root.firstChild) root.removeChild(root.firstChild);

  const ol = paletteVar('outline', palette);

  if (ground) {
    const groundLine = document.createElementNS(NS, 'line');
    groundLine.setAttribute('x1', String(box.x));
    groundLine.setAttribute('y1', String(GROUND_Y));
    groundLine.setAttribute('x2', String(box.x + box.w));
    groundLine.setAttribute('y2', String(GROUND_Y));
    groundLine.setAttribute('stroke', paletteVar('ground', palette));
    groundLine.setAttribute('stroke-width', '3');
    groundLine.setAttribute('stroke-linecap', 'round');
    root.appendChild(groundLine);
  }

  for (const p of r.props) {
    const rect = propRect(root, paletteVar('prop', palette), null);
    rect.setAttribute('x', String(p.x));
    rect.setAttribute('y', String(p.y));
    rect.setAttribute('width', String(p.w));
    rect.setAttribute('height', String(p.h));
  }

  // A weight worn on the back is occluded by the torso, so it is created before
  // the fill pass; one held at the chest is moved in front further down.
  let held: SVGRectElement | null = null;
  if (r.heldLoad === 'front' || r.heldLoad === 'back') {
    held = propRect(root, paletteVar('prop', palette), ol);
    held.setAttribute('width', '26');
    held.setAttribute('height', '20');
  }

  const far = r.view === 'side' ? FAR_OPACITY : undefined;
  const layers = figureLayers(r, proportions);

  const outline: Record<string, SVGPolylineElement> = {};
  for (const l of layers) {
    if (l.hidden) continue;
    outline[l.key] = line(root, ol, l.strokeWidth + OUTLINE * 2, l.dim ? far : undefined);
  }

  const outlineHead = document.createElementNS(NS, 'circle');
  outlineHead.setAttribute('r', String(proportions.headR + OUTLINE));
  outlineHead.setAttribute('fill', ol);
  root.appendChild(outlineHead);

  const fill: Record<string, SVGPolylineElement> = {};
  for (const l of layers) {
    if (l.hidden) continue;
    fill[l.key] = line(
      root,
      paletteVar(BONE_FILL[l.key] ?? 'leg', palette),
      l.strokeWidth,
      l.dim ? far : undefined,
    );
  }

  const load =
    hideLoad || r.load === 'none'
      ? null
      : line(root, paletteVar('load', palette), r.load === 'torso' ? 9 : 6.5);

  if (r.heldLoad === 'front' && held) root.appendChild(held);

  // What the figure grips, shaped like the thing itself: a rounded pack with a
  // strap, or a round jug. Far side first, dimmed to match its limb.
  const weights: SVGElement[] = [];
  const straps: SVGPolylineElement[] = [];
  if (r.heldLoad === 'hands') {
    for (const opacity of [far, undefined]) {
      if (r.implement === 'jug' || r.implement === 'bottle') {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('r', r.implement === 'jug' ? '8' : '6');
        c.setAttribute('fill', paletteVar('weight', palette));
        if (opacity !== undefined) c.setAttribute('opacity', String(opacity));
        root.appendChild(c);
        weights.push(c);
      } else {
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('width', '17');
        rect.setAttribute('height', '19');
        rect.setAttribute('rx', '5');
        rect.setAttribute('fill', paletteVar('weight', palette));
        if (opacity !== undefined) rect.setAttribute('opacity', String(opacity));
        root.appendChild(rect);
        weights.push(rect);
        straps.push(line(root, paletteVar('head', palette), 2.2, opacity));
      }
    }
  }

  const head = document.createElementNS(NS, 'circle');
  head.setAttribute('r', String(proportions.headR));
  head.setAttribute('fill', paletteVar('head', palette));
  root.appendChild(head);

  // Eyes are the only cue that tells a viewer which way the figure faces, and
  // whether a symmetric pose is seen from the front or the back.
  const eyes: SVGCircleElement[] = [];
  for (let i = 0; i < (r.view === 'front' ? 2 : 1); i += 1) {
    const eye = document.createElementNS(NS, 'circle');
    eye.setAttribute('r', String(EYE_R));
    eye.setAttribute('fill', ol);
    root.appendChild(eye);
    eyes.push(eye);
  }

  return { outline, outlineHead, fill, load, head, eyes, held, weights, straps };
}

/** The geometry is computed in `draw`; this only writes it onto the elements. */
function paint(parts: Parts, pose: RigPose, r: ResolvedPattern, proportions: Proportions) {
  const g = figureGeometry(pose, r, proportions);

  for (const key of Object.keys(g.bones)) {
    const points = g.bones[key];
    parts.outline[key]?.setAttribute('points', points);
    parts.fill[key]?.setAttribute('points', points);
  }

  if (parts.load && g.load) parts.load.setAttribute('points', g.load);

  g.weights.forEach((w, i) => {
    const el = parts.weights[i];
    if (!el) return;
    if (el.tagName === 'circle') {
      el.setAttribute('cx', String(w.cx));
      el.setAttribute('cy', String(w.cy));
    } else {
      el.setAttribute('x', String(w.cx - 8.5));
      el.setAttribute('y', String(w.cy - 9.5));
      parts.straps[i]?.setAttribute('points', w.strap);
    }
  });

  if (parts.held && g.held) {
    parts.held.setAttribute('x', String(g.held[0]));
    parts.held.setAttribute('y', String(g.held[1]));
  }

  parts.head.setAttribute('cx', String(g.head[0]));
  parts.head.setAttribute('cy', String(g.head[1]));
  parts.outlineHead.setAttribute('cx', String(g.head[0]));
  parts.outlineHead.setAttribute('cy', String(g.head[1]));

  for (let i = 0; i < parts.eyes.length; i += 1) {
    const eye = g.eyes[i];
    if (!eye) continue;
    parts.eyes[i].setAttribute('cx', String(eye[0]));
    parts.eyes[i].setAttribute('cy', String(eye[1]));
  }
}

/**
 * An animated exercise figure.
 *
 * ```tsx
 * <ExerciseFigure pattern="squat" params={{ range: 0.6 }} label="Squat to 60%" />
 * ```
 *
 * Honours `prefers-reduced-motion` by rendering the working keyframe as a still
 * image with a play control, rather than animating regardless.
 */
export function ExerciseFigure({
  pattern,
  params,
  animationType,
  label,
  playing = true,
  hideLoad = false,
  palette = {},
  proportions = DEFAULT_PROPORTIONS,
  width,
  height,
  className,
  budgetExempt = false,
  forceReducedMotion = false,
}: ExerciseFigureProps) {
  const groupRef = useRef<SVGGElement | null>(null);
  const partsRef = useRef<Parts | null>(null);
  const [userStarted, setUserStarted] = useState(false);
  const systemReduced = useSyncExternalStore(
    subscribeToReducedMotion,
    readReducedMotion,
    reducedMotionOnServer,
  );

  // Serialised so a caller passing an inline object literal does not rebuild the
  // whole element tree on every render.
  const paramsKey = JSON.stringify(params ?? {});
  const paletteKey = JSON.stringify(palette);

  const resolved = useMemo(() => {
    const base = getPattern(pattern);
    return base
      ? applyRigParams(base, JSON.parse(paramsKey) as RigParams, animationType)
      : null;
  }, [pattern, paramsKey, animationType]);

  // Unioned over every keyframe and held fixed for the whole cycle —
  // recomputing per frame would make the figure visibly pulse.
  const box = useMemo<Box>(
    () => (resolved ? figureBounds(resolved, proportions) : { x: 80, y: 8, w: 160, h: 178 }),
    [resolved, proportions],
  );

  const reduced = systemReduced || forceReducedMotion;
  const wantsAnimation = playing && (!reduced || userStarted);

  useEffect(() => {
    const root = groupRef.current;
    if (!root || !resolved) return;
    partsRef.current = build(
      root,
      resolved,
      proportions,
      box,
      JSON.parse(paletteKey) as Palette,
      hideLoad,
      true,
    );
    return () => {
      partsRef.current = null;
    };
  }, [resolved, proportions, box, paletteKey, hideLoad]);

  useEffect(() => {
    const parts = partsRef.current;
    if (!parts || !resolved) return;

    // requestAnimationFrame never fires while the tab is hidden, so paint the
    // first frame synchronously or the figure mounts with empty geometry.
    const frames = resolved.keyframes;
    paint(parts, reduced ? frames[frames.length - 1] : frames[0], resolved, proportions);

    if (!wantsAnimation) return;
    if (!budgetExempt && activeLoops >= MAX_CONCURRENT_LOOPS) return;

    activeLoops += 1;
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      // Timestamp-derived, never decremented: a counter driven by elapsed real
      // time stays correct when the tab is throttled or the phone locks.
      paint(parts, poseAt(resolved, ts - start), resolved, proportions);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      activeLoops -= 1;
    };
  }, [resolved, wantsAnimation, reduced, budgetExempt, proportions]);

  const viewBox = viewBoxOf(box);
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ role: 'presentation', 'aria-hidden': true } as const);

  if (!resolved) {
    // An unknown pattern id renders nothing rather than throwing: a missing
    // demonstration should not take a page down with it.
    return null;
  }

  return (
    <>
      <svg viewBox={viewBox} width={width} height={height} className={className} {...a11y}>
        <g ref={groupRef} />
      </svg>
      {reduced && !userStarted && playing ? (
        <button type="button" onClick={() => setUserStarted(true)}>
          {label ? `Play ${label}` : 'Play animation'}
        </button>
      ) : null}
    </>
  );
}

export { DEFAULT_PALETTE, type Palette } from '../render';
