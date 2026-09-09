import { describe, expect, it } from 'vitest';
import { poseAt } from './pose';
import { applyRigParams } from './params';
import { PATTERNS, getPattern } from './patterns';
import { BONE_FILL, DEFAULT_PALETTE, figureLayers, toSVG } from './render';
import { DEFAULT_PROPORTIONS } from './solve';

/**
 * The string renderer exists so the rig works without a DOM. These run in plain
 * Node with no jsdom, which is the point — if any of this reaches for
 * `document`, the suite fails rather than silently requiring a browser.
 */

const patterns = Object.values(PATTERNS);

function render(id: string, params: Record<string, unknown> = {}) {
  const base = getPattern(id);
  if (!base) throw new Error(`no pattern ${id}`);
  const resolved = applyRigParams(base, params);
  return toSVG(poseAt(resolved, 0), resolved);
}

describe('toSVG runs without a DOM', () => {
  it('has no document available in this environment', () => {
    // Guards the guarantee rather than assuming it.
    expect(typeof globalThis.document).toBe('undefined');
  });

  it.each(patterns.map((p) => [p.id] as const))('%s renders a complete svg document', (id) => {
    const svg = render(id);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox="');
  });

  it.each(patterns.map((p) => [p.id] as const))('%s emits no NaN coordinates', (id) => {
    expect(render(id)).not.toMatch(/NaN|Infinity|undefined/);
  });

  it.each(patterns.map((p) => [p.id] as const))('%s has balanced tags', (id) => {
    const svg = render(id);
    const opens = (svg.match(/<[a-z]/g) ?? []).length;
    const closes = (svg.match(/\/>/g) ?? []).length + (svg.match(/<\//g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

describe('every drawn limb appears twice — outline pass then fill pass', () => {
  it.each(patterns.map((p) => [p.id, p] as const))('%s', (_id, pattern) => {
    const resolved = applyRigParams(pattern, {});
    const svg = toSVG(poseAt(resolved, 0), resolved);
    const visible = figureLayers(resolved, DEFAULT_PROPORTIONS).filter((l) => !l.hidden);
    // Each visible bone contributes one outline polyline and one fill polyline.
    // Anything else means a seam (fill without outline) or a ghost (the reverse).
    const polylines = (svg.match(/<polyline /g) ?? []).length;
    expect(polylines).toBeGreaterThanOrEqual(visible.length * 2);
  });
});

describe('theming', () => {
  it('emits CSS custom properties with the authored colour as a fallback', () => {
    const svg = render('squat');
    expect(svg).toContain(`var(--color-figure-outline, ${DEFAULT_PALETTE.outline})`);
    expect(svg).toContain(`var(--color-figure-leg, ${DEFAULT_PALETTE.leg})`);
  });

  it('honours a palette override in the fallback, so it applies with no CSS', () => {
    const base = getPattern('squat')!;
    const resolved = applyRigParams(base, {});
    const svg = toSVG(poseAt(resolved, 0), resolved, { palette: { leg: '#ff0000' } });
    expect(svg).toContain('var(--color-figure-leg, #ff0000)');
    // Untouched entries keep their authored colour.
    expect(svg).toContain(`var(--color-figure-torso, ${DEFAULT_PALETTE.torso})`);
  });

  it('maps every bone to a palette entry that exists', () => {
    for (const key of Object.values(BONE_FILL)) {
      expect(DEFAULT_PALETTE[key]).toBeDefined();
    }
  });
});

describe('accessibility', () => {
  it('is hidden from assistive tech when it carries no title', () => {
    const svg = render('squat');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('role="presentation"');
  });

  it('becomes a labelled image when given a title', () => {
    const base = getPattern('squat')!;
    const resolved = applyRigParams(base, {});
    const svg = toSVG(poseAt(resolved, 0), resolved, { title: 'Bodyweight squat' });
    expect(svg).toContain('role="img"');
    expect(svg).toContain('<title>Bodyweight squat</title>');
    expect(svg).not.toContain('aria-hidden');
  });

  it('escapes a title that contains markup', () => {
    const base = getPattern('squat')!;
    const resolved = applyRigParams(base, {});
    const svg = toSVG(poseAt(resolved, 0), resolved, { title: '<script>alert("x")</script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
});

describe('range is visible in the output', () => {
  it('a narrower range produces different geometry from a full one', () => {
    const shallow = render('squat', { range: 0.4 });
    const deep = render('squat', { range: 1 });
    expect(shallow).not.toBe(deep);
  });

  it('renders across the full sweep without producing invalid coordinates', () => {
    for (const range of [0, 0.3, 0.6, 0.9, 1.2]) {
      expect(render('squat', { range })).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('options', () => {
  it('omits the ground line when asked', () => {
    const base = getPattern('squat')!;
    const resolved = applyRigParams(base, {});
    const pose = poseAt(resolved, 0);
    expect(toSVG(pose, resolved, { ground: false })).not.toContain('<line ');
    expect(toSVG(pose, resolved, { ground: true })).toContain('<line ');
  });

  it('sets explicit dimensions only when given them', () => {
    const base = getPattern('squat')!;
    const resolved = applyRigParams(base, {});
    const pose = poseAt(resolved, 0);
    expect(toSVG(pose, resolved)).not.toMatch(/\swidth="/);
    expect(toSVG(pose, resolved, { width: 120, height: 120 })).toMatch(/\swidth="120"/);
  });
});
