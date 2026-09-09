import { describe, expect, it } from 'vitest';
import { EXERCISES, VOCAB, findExercises, getExercise } from './index';
import { PATTERNS, getPattern } from '../patterns';
import { applyRigParams } from '../params';
import { poseAt } from '../pose';
import { toSVG } from '../render';

/**
 * This file exists because the export shipped broken once. The dataset JSON is
 * an object with the array under `exercises`, it was read as if it were the
 * array itself, and a `as unknown as` assertion made the typechecker agree.
 * Nothing imported the module, so a full green suite proved nothing about it.
 *
 * The lesson generalises: an entry point with no test is an entry point with no
 * evidence, however green everything around it is.
 */

describe('the module loads at all', () => {
  it('exposes an array, not the wrapper object', () => {
    expect(Array.isArray(EXERCISES)).toBe(true);
    expect(EXERCISES).toHaveLength(178);
  });

  it('exposes the controlled vocabularies', () => {
    expect(VOCAB).toBeTypeOf('object');
    expect(Array.isArray(VOCAB.equipment)).toBe(true);
    expect(Array.isArray(VOCAB.animation_type)).toBe(true);
  });
});

describe('every entry is usable', () => {
  it('has the fields the type promises', () => {
    for (const e of EXERCISES) {
      expect(typeof e.slug).toBe('string');
      expect(e.slug.length).toBeGreaterThan(0);
      expect(typeof e.name).toBe('string');
      expect(typeof e.rig).toBe('string');
      expect(['rep', 'hold', 'timed']).toContain(e.animation_type);
    }
  });

  it('has unique slugs', () => {
    const slugs = EXERCISES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('lookups', () => {
  it('finds a known exercise by slug', () => {
    const e = getExercise('push-up');
    expect(e).not.toBeNull();
    expect(e?.name).toBe('Push-up');
    expect(e?.rig).toBe('pushup_horizontal');
  });

  it('returns null rather than throwing for an unknown slug', () => {
    expect(getExercise('not-an-exercise')).toBeNull();
  });

  it('searches names and alternate names, case-insensitively', () => {
    expect(findExercises('PUSH-UP').some((e) => e.slug === 'push-up')).toBe(true);
    expect(findExercises('')).toEqual([]);
  });
});

describe('the catalogue and the pattern registry agree', () => {
  // The two ship together, so a rename on one side that is not made on the
  // other should fail here rather than in a consumer's UI.
  it('every exercise naming a bundled pattern resolves to it', () => {
    for (const e of EXERCISES) {
      if (!(e.rig in PATTERNS)) continue;
      expect(getPattern(e.rig)).not.toBeNull();
    }
  });

  it('an exercise on an unauthored pattern resolves to null rather than throwing', () => {
    const unauthored = EXERCISES.filter((e) => !(e.rig in PATTERNS));
    // The catalogue deliberately covers more exercises than there are patterns;
    // consumers are expected to render a fallback for these.
    expect(unauthored.length).toBeGreaterThan(0);
    for (const e of unauthored) expect(getPattern(e.rig)).toBeNull();
  });

  // Rendering every catalogued exercise to a full SVG document is the check
  // that matters most here, and it is slow enough to need more than the 5s
  // default — the cost is the coverage, so it gets the time rather than a
  // sample.
  it(
    'renders end to end for every exercise that has a pattern',
    () => {
      const renderable = EXERCISES.filter((e) => e.rig in PATTERNS);
      expect(renderable.length).toBeGreaterThan(0);
      for (const e of renderable) {
        const base = getPattern(e.rig);
        const resolved = applyRigParams(base!, e.rig_params ?? {}, e.animation_type);
        const svg = toSVG(poseAt(resolved, 0), resolved, { title: e.name });
        expect(svg.startsWith('<svg ')).toBe(true);
        expect(svg).not.toMatch(/NaN|Infinity|undefined/);
      }
    },
    60_000,
  );
});

describe('what ships to consumers', () => {
  it('carries no internal project paperwork', () => {
    const blob = JSON.stringify({ EXERCISES, VOCAB });
    expect(blob).not.toMatch(/free-exercise-db/i);
    expect(blob).not.toMatch(/SPEC-\d/);
  });
});
