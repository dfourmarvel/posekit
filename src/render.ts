import type { Proportions, ResolvedPattern, RigPose } from './types';
import { DEFAULT_PROPORTIONS, GROUND_Y } from './solve';
import { OUTLINE, figureBounds, figureGeometry, viewBoxOf, type Box } from './draw';

/**
 * The palette the patterns were authored against: clay and sage over a
 * dark-green outline, flat fills only — no gradients, no shading.
 *
 * Every value is emitted as a CSS custom property with this colour as its
 * fallback, so the same markup themes in a browser and still renders correctly
 * in Node, an email client, or an `<img src="data:...">` where no stylesheet
 * exists.
 */
export const DEFAULT_PALETTE = {
  outline: '#2f4a2a',
  head: '#f2eed8',
  arm: '#b9cf86',
  torso: '#8aa578',
  leg: '#3f5c37',
  load: '#e08a2e',
  ground: '#e2e8d8',
  prop: '#dfe6e1',
  weight: '#2b322e',
} as const;

export type PaletteKey = keyof typeof DEFAULT_PALETTE;
export type Palette = Partial<Record<PaletteKey, string>>;

export const FAR_OPACITY = 0.4;
export const EYE_R = 2.3;

/** Which palette entry fills each bone. */
export const BONE_FILL: Record<string, PaletteKey> = {
  legL: 'leg',
  armL: 'arm',
  footL: 'leg',
  handL: 'leg',
  torso: 'torso',
  legR: 'leg',
  footR: 'leg',
  armR: 'arm',
  handR: 'leg',
};

export type Layer = {
  key: string;
  /** Fill stroke width; the outline pass adds `OUTLINE * 2` on top of this. */
  strokeWidth: number;
  /** Far-side limbs are dimmed in a side view so depth reads. */
  dim: boolean;
  hidden: boolean;
};

/**
 * Back-to-front draw order, shared by the string renderer and the React binding
 * so the two can never disagree about what the figure is made of.
 *
 * Far-side limbs first, then the torso, then the near side, so the near arm and
 * leg land on top of everything else.
 */
export function figureLayers(resolved: ResolvedPattern, proportions: Proportions): Layer[] {
  const w = proportions.width;
  const hideArmL = resolved.hideFarArm;
  const hideLegL = resolved.hideFarLeg;
  return [
    { key: 'legL', strokeWidth: w.leg, dim: true, hidden: hideLegL },
    { key: 'armL', strokeWidth: w.arm, dim: true, hidden: hideArmL },
    { key: 'footL', strokeWidth: w.foot, dim: true, hidden: hideLegL },
    { key: 'handL', strokeWidth: w.hand, dim: true, hidden: hideArmL },
    { key: 'torso', strokeWidth: w.torso, dim: false, hidden: false },
    { key: 'legR', strokeWidth: w.leg, dim: false, hidden: false },
    { key: 'footR', strokeWidth: w.foot, dim: false, hidden: false },
    { key: 'armR', strokeWidth: w.arm, dim: false, hidden: false },
    { key: 'handR', strokeWidth: w.hand, dim: false, hidden: false },
  ];
}

/** `var(--color-figure-leg, #3f5c37)` — themeable, correct with no CSS at all. */
export function paletteVar(key: PaletteKey, palette: Palette = {}): string {
  return `var(--color-figure-${key}, ${palette[key] ?? DEFAULT_PALETTE[key]})`;
}

export type RenderOptions = {
  /** Override any palette entry. Omitted entries keep the authored colour. */
  palette?: Palette;
  /** Limb thicknesses and head radius. Defaults to `DEFAULT_PROPORTIONS`. */
  proportions?: Proportions;
  /** `width`/`height` attributes on the root element. Omit for a fluid SVG. */
  width?: number;
  height?: number;
  /**
   * Drop the amber load band. It is illegible below roughly 80px wide and costs
   * a bone's worth of pixels there, so small renders are better without it.
   */
  hideLoad?: boolean;
  /** Draw the ground line. Default true. */
  ground?: boolean;
  /**
   * Crop to the figure's own bounds rather than the fixed view box. Default
   * true — a prone figure and a standing one then both fill their slot.
   */
  crop?: boolean;
  /** Accessible label. Emitted as `<title>` with `role="img"`. */
  title?: string;
  /** Extra attributes on the root `<svg>`, e.g. `class`. */
  attributes?: Record<string, string>;
};

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (n: number) =>
  Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));

function attrs(map: Record<string, string | number | undefined>): string {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}="${esc(String(v))}"`)
    .join(' ');
}

function polyline(points: string, stroke: string, width: number, opacity?: number): string {
  return `<polyline ${attrs({
    points,
    fill: 'none',
    stroke,
    'stroke-width': num(width),
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    opacity: opacity === undefined ? undefined : num(opacity),
  })}/>`;
}

/**
 * Render one moment of a movement as a complete, standalone SVG document.
 *
 * Two passes over the limbs: one silhouette outline, then the coloured fills on
 * top. Drawing the outline underneath as its own pass is what stops seams
 * appearing where two limbs meet.
 *
 * ```ts
 * const resolved = applyRigParams(getPattern('squat')!, { range: 0.6 });
 * const svg = toSVG(poseAt(resolved, 400), resolved, { title: 'Squat' });
 * ```
 */
export function toSVG(
  pose: RigPose,
  resolved: ResolvedPattern,
  options: RenderOptions = {},
): string {
  const {
    palette = {},
    proportions = DEFAULT_PROPORTIONS,
    width,
    height,
    hideLoad = false,
    ground = true,
    crop = true,
    title,
    attributes = {},
  } = options;

  const g = figureGeometry(pose, resolved, proportions);
  const box: Box = crop
    ? figureBounds(resolved, proportions)
    : { x: 80, y: 8, w: 160, h: 178 };

  const ol = paletteVar('outline', palette);
  const far = resolved.view === 'side' ? FAR_OPACITY : undefined;
  const layers = figureLayers(resolved, proportions);
  const parts: string[] = [];

  if (ground) {
    parts.push(
      `<line ${attrs({
        x1: num(box.x),
        y1: num(GROUND_Y),
        x2: num(box.x + box.w),
        y2: num(GROUND_Y),
        stroke: paletteVar('ground', palette),
        'stroke-width': 3,
        'stroke-linecap': 'round',
      })}/>`,
    );
  }

  // Support surfaces the figure rests on sit behind everything.
  for (const p of resolved.props) {
    parts.push(
      `<rect ${attrs({
        x: num(p.x),
        y: num(p.y),
        width: num(p.w),
        height: num(p.h),
        rx: 4,
        fill: paletteVar('prop', palette),
      })}/>`,
    );
  }

  // A weight worn on the back is occluded by the torso, so it goes before the
  // fill pass; one held at the chest is not, and goes after it.
  const heldRect = (): string =>
    g.held
      ? `<rect ${attrs({
          x: num(g.held[0]),
          y: num(g.held[1]),
          width: 26,
          height: 20,
          rx: 4,
          fill: paletteVar('prop', palette),
          stroke: ol,
          'stroke-width': 2,
        })}/>`
      : '';

  if (resolved.heldLoad === 'back') parts.push(heldRect());

  for (const l of layers) {
    if (l.hidden) continue;
    const points = g.bones[l.key];
    if (!points) continue;
    parts.push(polyline(points, ol, l.strokeWidth + OUTLINE * 2, l.dim ? far : undefined));
  }

  parts.push(
    `<circle ${attrs({
      cx: num(g.head[0]),
      cy: num(g.head[1]),
      r: num(proportions.headR + OUTLINE),
      fill: ol,
    })}/>`,
  );

  for (const l of layers) {
    if (l.hidden) continue;
    const points = g.bones[l.key];
    if (!points) continue;
    const fill = paletteVar(BONE_FILL[l.key] ?? 'leg', palette);
    parts.push(polyline(points, fill, l.strokeWidth, l.dim ? far : undefined));
  }

  if (!hideLoad && g.load && resolved.load !== 'none') {
    parts.push(
      polyline(g.load, paletteVar('load', palette), resolved.load === 'torso' ? 9 : 6.5),
    );
  }

  if (resolved.heldLoad === 'front') parts.push(heldRect());

  // What the figure grips, shaped like the thing itself. Far side first, dimmed
  // to match the limb holding it.
  g.weights.forEach((weight, i) => {
    const opacity = i === 0 ? far : undefined;
    if (resolved.implement === 'jug' || resolved.implement === 'bottle') {
      parts.push(
        `<circle ${attrs({
          cx: num(weight.cx),
          cy: num(weight.cy),
          r: resolved.implement === 'jug' ? 8 : 6,
          fill: paletteVar('weight', palette),
          opacity: opacity === undefined ? undefined : num(opacity),
        })}/>`,
      );
    } else {
      parts.push(
        `<rect ${attrs({
          x: num(weight.cx - 8.5),
          y: num(weight.cy - 9.5),
          width: 17,
          height: 19,
          rx: 5,
          fill: paletteVar('weight', palette),
          opacity: opacity === undefined ? undefined : num(opacity),
        })}/>`,
      );
      if (weight.strap) {
        parts.push(polyline(weight.strap, paletteVar('head', palette), 2.2, opacity));
      }
    }
  });

  parts.push(
    `<circle ${attrs({
      cx: num(g.head[0]),
      cy: num(g.head[1]),
      r: num(proportions.headR),
      fill: paletteVar('head', palette),
    })}/>`,
  );

  // Eyes are the only cue for which way the figure faces, and whether a
  // symmetric pose is seen from the front or the back.
  for (const [ex, ey] of g.eyes) {
    parts.push(`<circle ${attrs({ cx: num(ex), cy: num(ey), r: EYE_R, fill: ol })}/>`);
  }

  const root = attrs({
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: viewBoxOf(box),
    width: width === undefined ? undefined : num(width),
    height: height === undefined ? undefined : num(height),
    role: title ? 'img' : 'presentation',
    'aria-hidden': title ? undefined : 'true',
    ...attributes,
  });

  return `<svg ${root}>${title ? `<title>${esc(title)}</title>` : ''}${parts.join('')}</svg>`;
}
