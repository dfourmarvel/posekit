import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyRigParams } from './params';
import { PATTERNS, getPattern } from './patterns';
import { poseAt } from './pose';
import { figureGeometry } from './draw';
import { buildSkeleton } from './solve';
import { toSVG } from './render';
import { EXERCISES } from './exercises/index';

/**
 * The README documented `buildSkeleton(pose)` and `figureGeometry(skeleton)`,
 * neither of which is a real signature — following it produced a TypeError.
 * Documentation drifts silently because nothing executes it, so these run the
 * examples and check the numbers the prose commits to.
 */

describe('the README quick-start actually runs', () => {
  it('renders a 60% squat exactly as written', () => {
    const squat = applyRigParams(getPattern('squat')!, { range: 0.6 });
    const svg = toSVG(poseAt(squat, 400), squat, { title: 'Squat to 60% depth' });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('<title>Squat to 60% depth</title>');
  });

  it('runs the documented pipeline, step by step', () => {
    const pattern = getPattern('squat')!;
    const resolved = applyRigParams(pattern, {});
    const pose = poseAt(resolved, 200);
    const geometry = figureGeometry(pose, resolved);
    const svg = toSVG(pose, resolved);

    expect(Object.keys(geometry.bones).length).toBeGreaterThan(0);
    expect(svg).toContain('<polyline');
  });

  it('exposes the solved limbs the way the README says to reach them', () => {
    const resolved = applyRigParams(getPattern('squat')!, {});
    const pose = poseAt(resolved, 0);
    const skeleton = buildSkeleton(pose, resolved.footDir, resolved.view, resolved.toe);
    expect(Number.isFinite(skeleton.hipX)).toBe(true);
    expect(Number.isFinite(skeleton.legR.endY)).toBe(true);
  });
});

describe('the README does not overstate the numbers', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

  it('states the real pattern count', () => {
    expect(readme).toContain(`${Object.keys(PATTERNS).length} movement patterns`);
  });

  it('states the real exercise count', () => {
    expect(readme).toContain(String(EXERCISES.length));
  });

  it('names a competitor rather than claiming to be the only such library', () => {
    expect(readme).toMatch(/workout-guide/);
    expect(readme).not.toMatch(/the only exercise animation library/i);
  });
});

describe('the licence is stated consistently everywhere', () => {
  // Three files have to agree, and a mismatch between the LICENSE file and the
  // package manifest is the kind of thing nobody notices until a lawyer does.
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const licence = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { license: string; files: string[] };

  it('ships the AGPL text, not some other licence', () => {
    expect(licence).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
    expect(licence).toContain('Version 3, 19 November 2007');
  });

  it('declares the matching SPDX identifier in the manifest', () => {
    expect(pkg.license).toBe('AGPL-3.0-or-later');
  });

  it('says AGPL in the README and no longer claims MIT as the current licence', () => {
    expect(readme).toMatch(/AGPL-3\.0-or-later/);
    // MIT may only be mentioned as history, never as the terms that apply now.
    const mitMentions = readme.match(/MIT/g) ?? [];
    expect(mitMentions.length).toBeLessThanOrEqual(1);
  });

  it('ships the commercial-licence offer to npm consumers', () => {
    expect(pkg.files).toContain('COMMERCIAL-LICENCE.md');
    expect(pkg.files).toContain('LICENSE');
  });
});
