import { describe, expect, it } from 'vitest';
import type { AnimationType, RigPattern } from './types';
import data from './exercises/exercises.json';
import { poseAt } from './pose';
import { applyRigParams } from './params';
import { buildSkeleton, skeletonPoints } from './solve';
import { PATTERNS } from './patterns';

/**
 * A ratchet on the fault in docs/spec/SPEC-07-param-audit.md.
 *
 * `applyRigParams` read 11 of the 66 rig_params keys in the seed data, so **72**
 * of the 131 exercises on a registered pattern drew as one of 20 animations — a
 * Cossack squat as a plain squat, flutter kicks as a reverse crunch. That figure
 * is this file's own signature run against commit 55b2b2e in a worktree, which is
 * the only way it means anything; two earlier numbers (63 and 76) came from a
 * weaker key-comparison and from stripping poses off the current registry, and
 * both were wrong. Every
 * invariant passed throughout, because each of those figures is a perfectly
 * plausible human doing a perfectly plausible exercise. Just not the named one.
 *
 * Nothing else in the suite can see this: the form contract asks whether one
 * figure is anatomically possible, never whether two exercises are telling the
 * user the same lie. This does, by fingerprinting what each row actually draws
 * over a whole cycle and counting the rows that draw something another row
 * already drew.
 *
 * The ceiling only ever goes down. Authoring a pose lowers it; if a change
 * raises it, a variant stopped rendering distinctly and the ceiling is not the
 * thing to edit.
 *
 * **What this cannot see.** It compares rounded coordinates, so it detects
 * *identical*, not *similar*. Two figures three units apart pass it and read the
 * same on a 56px thumbnail. Measured mean per-point distance to the nearest
 * neighbour on the same pattern, smallest first: Crunch~Sit-up 0.8,
 * Shoulder taps~Plank reach 1.7, Prone T~Prone W 2.0, Neck flexion~extension 2.3,
 * Archer~Staggered push-up 2.4 — all predating the pose work. The closest pairs
 * this change introduced sit above that floor (Leg raise~Bent-knee raise 3.6,
 * Hollow hold~Hollow rocks 3.8, V-up~Jackknife 4.8), and the pairs below it are
 * mostly `range`/`hold` variants, whose 1.15× scaling is a genuinely small visual
 * change. A distance threshold was considered and rejected: set high enough to
 * mean anything it fails those existing pairs, and set low enough to pass them it
 * asserts nothing. Judge near-collisions by eye on the contact sheet
 * (`RIG_SHEET=...` in sheet.test.ts), not here.
 */
type Row = {
  name: string;
  rig?: string;
  animation_type?: AnimationType;
  rig_params?: Record<string, unknown>;
};

/**
 * The 12 that remain, in 4 groups, and why each survives. Anything not accounted
 * for here that starts colliding is a regression.
 *
 * Every survivor is now pile (b) of the audit: a difference this camera cannot
 * express, classified as such before any code was written. Grip width (Wide,
 * Diamond, Close-grip push-up), grip rotation (Hammer, Reverse curl), fingertip
 * (push-up and plank), cross-body (Cross-body mountain climbers) — each sharing
 * a group with the plain exercise it cannot be distinguished from. **This is the
 * floor, not a backlog.** Separating any of them needs a second camera angle,
 * which the rig does not have; do not author `poses.fingertip` or
 * `poses.squeeze` to close the gap, because the generalised selector would make
 * those dead keys live and collapse other rows into them.
 *
 * The audit predicted 16 pile-(b) survivors. Measured membership was 14, and
 * deriving `hold` from `animation_type` took it to 12: it separated Plate pinch
 * from Farmer's carry, which the audit had written off as `pinch`, grip style.
 * The grip is indeed undrawable; what separates them is that a plate pinch is
 * held and a carry walks, and no one had looked past the key name. The
 * signature is the number, and it disagreed with the classification twice.
 *
 * NOT `towel` or `squeeze`, though both are pile (b) too: those exercises hold
 * nothing while their neighbours hold an implement, so the renderer separates
 * them already and they are in no group.
 *
 * **What closed since the ceiling was 20.** All four were the same fault — an
 * exercise not rendering as itself — arriving through `elevate`, a param that is
 * implemented and documented:
 *
 * - `bridge`, `plank_hold` and `supine_hamstring` had no `derive`, so
 *   `elevate: 'feet'` parsed, resolved and did nothing. Elevated glute bridge
 *   drew as Glute bridge, Decline plank as High plank, Couch hamstring curl as
 *   Sliding leg curl. Each pattern now derives: the supine two re-solve the hip
 *   from the pinned shoulder and the raised heel, the plank re-solves its body
 *   angle by bisection the way `pushup_horizontal` does.
 * - **Hip thrust needed a pattern, not a `derive`.** It carried
 *   `elevate: 'shoulders'`, which `applyRigParams` never converts to a rise and
 *   which can never select a pose either, `elevate` being excluded from pose
 *   candidacy — inert twice over. A shoulder-supported thrust is a different
 *   kinematic chain, which is exactly the case SPEC-07 §6.2 says must not be
 *   mapped onto a pattern depicting a different movement. It has its own
 *   `hip_thrust` pattern and its own row in the seed data, as the `seated`
 *   exercises did in batch 4.
 *
 * **What `animation_type` closed.** Thirty rows are typed `'hold'` in the seed
 * data and nothing read the column, so they animated a full rep — a hollow body
 * hold ran the whole crunch, a superman the whole prone raise. `applyRigParams`
 * now derives `hold` from it when `rig_params.hold` is absent, and this
 * signature passes each row's own `animation_type` because that is what the
 * component receives: `ExerciseFigure.animationType` is a required prop, so a
 * surface cannot quietly leave it out and render something this file never saw.
 *
 * **A held implement counts as a difference here, and that flattered this number
 * before batch 5.** Arnold press animated exactly like Overhead press, and
 * Upright row exactly like Lateral raise; each pair was separated only by holding
 * a jug rather than a pack, so neither appeared in a group despite the figure
 * doing the same thing. Both now have poses of their own and genuinely differ.
 * The caveat stands for any future pair: this signature can be fooled by the
 * object in the hands.
 */
const CEILING = 12;

function signature(row: Row, patterns: Record<string, RigPattern>): string {
  const r = applyRigParams(patterns[row.rig as string], row.rig_params ?? {}, row.animation_type);
  // Hidden limbs and a held implement are part of what the user sees, so a
  // single-leg variant is not a collision with its two-legged parent.
  const out: (number | string)[] = [
    r.hideFarArm ? 'A' : '',
    r.hideFarLeg ? 'L' : '',
    r.heldLoad ?? '',
    r.implement,
    r.props.length,
  ];
  for (let i = 0; i < 12; i += 1) {
    const pose = poseAt(r, (r.cycleMs * i) / 12);
    for (const [x, y] of skeletonPoints(buildSkeleton(pose, r.footDir, r.view, r.toe))) {
      out.push(Math.round(x * 2), Math.round(y * 2));
    }
  }
  return out.join(',');
}

describe('exercises render as themselves', () => {
  const live = (data as { exercises: Row[] }).exercises.filter((e) => e.rig && PATTERNS[e.rig]);

  const groups = new Map<string, string[]>();
  for (const row of live) {
    const k = signature(row, PATTERNS);
    groups.set(k, [...(groups.get(k) ?? []), row.name]);
  }
  const collisions = [...groups.values()].filter((n) => n.length > 1);
  const colliding = collisions.reduce((a, n) => a + n.length, 0);

  it(`no more than ${CEILING} of ${live.length} exercises draw as another`, () => {
    expect(
      colliding,
      `colliding groups:\n${collisions.map((n) => `  ${n.join(' / ')}`).join('\n')}`,
    ).toBeLessThanOrEqual(CEILING);
  });

  it('every exercise the audit has repaired is distinct', () => {
    // The two batches that closed 21 of these. A regression here means a pose
    // stopped being selected — most likely the selector, not the keyframes.
    const fixed = [
      // Batch 2 and 3 — named poses on a pattern they already sat on.
      'Toe touch crunch', 'V-up', 'Jackknife', 'Bicycle crunch', 'Hollow body hold',
      'Hollow rocks', 'Leg raise', 'Bent-knee raise', 'Flutter kicks', 'Scissor kicks',
      'Heel taps', 'Chair squat', 'Jump squat', 'Thruster', 'Split squat',
      'Bulgarian split squat', 'Reverse lunge', 'Walking lunge',
      // Batch 4 — moved to a pattern of their own, because each needed a field
      // that lives on the pattern rather than on a `poses` entry.
      'Cossack squat', 'Lateral lunge', 'Curtsy lunge', 'Sissy squat', 'Bear plank',
      'Concentration curl', 'Seated calf raise', 'Front raise', 'Sphinx push-up',
      // Batch 5 — the last of the audit's pile (a).
      'Clap push-up', 'Pseudo planche push-up', 'Tate press', 'Arnold press',
      'Upright row', 'Wall slide', 'Arm circles', 'Cuban rotation', 'Swimmer',
      "World's greatest stretch", 'Backpack deadlift', 'Clean and press',
      'Frog pump', 'Glute bridge march', 'Stair calf raise', 'Pogo hops',
      'Jump rope', 'Fast feet',
      // Batch 6 — `elevate`, which was implemented all along and inert on any
      // pattern with no `derive`. Hip thrust is the odd one out: a new pattern.
      'Elevated glute bridge', 'Decline plank', 'Couch hamstring curl', 'Hip thrust',
      // Batch 7 — `animation_type`, a column no code read.
      'Plate pinch',
    ];
    for (const name of fixed) {
      const row = live.find((e) => e.name === name);
      expect(row, name).toBeDefined();
      const shared = groups.get(signature(row as Row, PATTERNS)) as string[];
      expect(shared, `${name} still draws identically to ${shared?.join(' / ')}`).toHaveLength(1);
    }
  });
});
