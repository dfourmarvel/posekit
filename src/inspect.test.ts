import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { poseAt } from './pose';
import { buildSkeleton, type Skeleton } from './solve';
import { PATTERNS } from './patterns';
import data from './exercises/exercises.json';

/**
 * Inspection tooling, not assertions — the real contract is in form.test.ts.
 *
 * Silent and trivially passing by default so `npm test` stays clean. Two opt-in
 * modes, both documented in docs/spec/HANDOFF-rig.md:
 *
 *   RIG_INSPECT=1 npx vitest run src/lib/rig/inspect.test.ts
 *     Prints the joint layout of every pattern. Run this on any new pattern
 *     before committing: the form invariants prove the figure is a plausible
 *     human, but they cannot tell you the limbs are arranged into the right
 *     exercise. A glute bridge once shipped folded in half with all tests green.
 *
 *   RIG_FRAMES=<path> npx vitest run src/lib/rig/inspect.test.ts
 *     Writes sampled frames for every pattern as JSON, for the standalone
 *     review viewer.
 */

const R = (n: number) => Math.round(n * 10) / 10;
const FRAMES = 48;

function exercisesByPattern() {
  const map = new Map<string, string[]>();
  for (const ex of data.exercises as Array<{ name: string; rig: string }>) {
    const list = map.get(ex.rig) ?? [];
    list.push(ex.name);
    map.set(ex.rig, list);
  }
  return map;
}

const at = (s: Skeleton, x: number, y: number) => `${x.toFixed(0)},${y.toFixed(0)}`;

it('rig inspection', () => {
  const patterns = Object.values(PATTERNS);
  expect(patterns.length).toBeGreaterThan(0);

  if (process.env.RIG_INSPECT) {
    const print = (p: (typeof patterns)[number], label: string) => {
      console.log(`\n=== ${label} (${p.view}, ${p.keyframes.length} keyframes) ===`);
      for (const frac of [0, 0.5]) {
        const s = buildSkeleton(poseAt(p, p.cycleMs * frac), p.footDir, p.view, p.toe);
        console.log(
          `t=${frac}`,
          '| head', at(s, s.headX, s.headY),
          '| shoulder', at(s, s.shoulderX, s.shoulderY),
          '| hip', at(s, s.hipX, s.hipY),
          '| elbow', at(s, s.armR.jointX, s.armR.jointY),
          '| hand', at(s, s.armR.endX, s.armR.endY),
          '| knee', at(s, s.legR.jointX, s.legR.jointY),
          '| ankle', at(s, s.legR.endX, s.legR.endY),
          '| toe', at(s, s.legR.tipX, s.legR.tipY),
        );
      }
    };

    for (const p of patterns) {
      print(p, p.id);
      // Named poses are what the data actually selects; printing only the base
      // keyframes hid three identical supine hamstring exercises for a week.
      for (const [name, keyframes] of Object.entries(p.poses ?? {})) {
        print({ ...p, keyframes }, `${p.id} · ${name}`);
      }
    }
  }

  const framePath = process.env.RIG_FRAMES;
  if (!framePath) return;

  const byPattern = exercisesByPattern();
  // Which patterns carry at least one exercise performed holding something.
  const handHeld = new Map<string, string>();
  for (const e of data.exercises as Array<{
    rig: string;
    rig_params?: { load?: string; implement?: string };
  }>) {
    if (e.rig_params?.load === 'hands' && !handHeld.has(e.rig)) {
      handHeld.set(e.rig, e.rig_params.implement ?? 'pack');
    }
  }
  const out = patterns.map((p) => {
    const frames = [];
    for (let i = 0; i < FRAMES; i += 1) {
      const s = buildSkeleton(poseAt(p, (p.cycleMs * i) / FRAMES), p.footDir, p.view, p.toe);
      const limb = (l: typeof s.armR) =>
        [l.rootX, l.rootY, l.jointX, l.jointY, l.endX, l.endY].map(R);
      const tip = (l: typeof s.armR) => [l.endX, l.endY, l.tipX, l.tipY].map(R);
      const ld =
        p.load === 'none' ? null
        : p.load === 'torso' ? [s.hipX, s.hipY, s.shoulderX, s.shoulderY].map(R)
        : p.load === 'upperArm' ? [s.armR.rootX, s.armR.rootY, s.armR.jointX, s.armR.jointY].map(R)
        : p.load === 'foreArm' ? [s.armR.jointX, s.armR.jointY, s.armR.endX, s.armR.endY].map(R)
        : p.load === 'thigh' ? [s.legR.rootX, s.legR.rootY, s.legR.jointX, s.legR.jointY].map(R)
        : [s.legR.jointX, s.legR.jointY, s.legR.endX, s.legR.endY].map(R);
      const ex = 15 * 0.42;
      const ey = -15 * 0.12;
      frames.push({
        t: [s.hipX, s.hipY, s.shoulderX, s.shoulderY].map(R),
        aR: limb(s.armR), aL: limb(s.armL), lR: limb(s.legR), lL: limb(s.legL),
        hR: tip(s.armR), hL: tip(s.armL), fR: tip(s.legR), fL: tip(s.legL),
        hd: [R(s.headX), R(s.headY)],
        ey:
          p.view === 'front'
            ? [
                [R(s.headX + ex * 0.8), R(s.headY + ey)],
                [R(s.headX - ex * 0.8), R(s.headY + ey)],
              ]
            : [[R(s.headX + ex), R(s.headY + ey)]],
        ld,
      });
    }
    return {
      id: p.id,
      view: p.view,
      cycleMs: p.cycleMs,
      loadBone: p.load,
      exercises: byPattern.get(p.id) ?? [],
      heldHands: handHeld.get(p.id) ?? null,
      frames,
    };
  });

  const pending = [...byPattern.entries()]
    .filter(([id]) => !PATTERNS[id])
    .map(([id, names]) => ({ id, count: names.length }))
    .sort((a, b) => b.count - a.count);

  writeFileSync(framePath, JSON.stringify({ patterns: out, pending, total: data.exercises.length }));
  console.log(`wrote ${out.length} patterns to ${framePath}`);
});
