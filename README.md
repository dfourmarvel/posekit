# posekit

Procedural 2D figure animation for exercise demonstration. The pose is solved from joint angles at runtime, so **range of motion, tempo and load are parameters** rather than frames somebody drew earlier.

```ts
import { getPattern, applyRigParams, poseAt, toSVG } from 'posekit';

const squat = applyRigParams(getPattern('squat')!, { range: 0.6 });
const svg = toSVG(poseAt(squat, 400), squat, { title: 'Squat to 60% depth' });
```

That `range: 0.6` is the whole point. It is a squat to about sixty percent depth — not a preset, not a different asset, the same movement travelling less far. No pre-rendered animation library can answer that request, because the frames were fixed when they were drawn.

## Why this exists

There are good exercise animation libraries already. [`workout-guide`](https://github.com/bryllim/workout-guide) has 302 exercises as static SVG frames, and several commercial sets ship 1,500+ pre-rendered Lottie or MP4 animations. If you want breadth, use one of those — they have far more exercises than this does.

posekit trades coverage for control:

| | Pre-rendered libraries | posekit |
|---|---|---|
| Exercises | 1,500+ | 178, over 36 movement patterns |
| Change range of motion | no | yes, continuously |
| Change tempo, load, grip | no | yes |
| Payload | 14–90 MB | **~22 KB gzipped** |
| Adding an exercise | commission an artist | write keyframes |
| Third-party asset licences | varies; often share-alike or paid | none — there are no third-party assets |
| Project licence | perpetual fee, per product | AGPL, or a commercial exception |

The size difference is not a micro-optimisation. It is the difference between an exercise library that works on a slow connection and one that does not.

## Install

```bash
npm install posekit
```

React is an optional peer dependency, needed only for `posekit/react`.

## The pipeline

Each step is exported, so you can stop wherever you need to:

```ts
const resolved = applyRigParams(pattern, params);      // variant, range, load
const pose     = poseAt(resolved, elapsedMs);          // joint targets at a moment
const geometry = figureGeometry(pose, resolved);       // drawable primitives
const svg      = toSVG(pose, resolved);                // a complete <svg>
```

`figureGeometry` runs the IK solver for you. If you want the solved limbs
themselves — to drive a canvas, a native renderer, or your own markup — call
`buildSkeleton(pose, resolved.footDir, resolved.view, resolved.toe)` and read
the joint coordinates off the result.

Nothing in the core touches the DOM. It runs in Node, a worker, or a browser.

## React

```tsx
import { ExerciseFigure } from 'posekit/react';

<ExerciseFigure pattern="squat" params={{ range: 0.6 }} label="Squat" />
```

It honours `prefers-reduced-motion` by rendering a still frame with a play control rather than animating anyway, and caps concurrent animation loops so a long list does not run one loop per row. Pass `label` to expose it to assistive technology; omit it and the figure is correctly hidden as decoration.

## Parameters

| Parameter | Values | Effect |
|---|---|---|
| `range` | `0`–`1.2`, or `'pulse'` / `'full'` | How far through the movement to travel. `1` is as authored. |
| `tempo` | number | Cycle speed. |
| `hold` | boolean | Freeze on the working keyframe. |
| `load` | `'hands'`, `'front'`, `'back'` | Where a weight is carried. |
| `implement` | `'pack'`, `'jug'`, `'bottle'` | What is held. |
| `elevate` | `'hands'`, `'feet'` | Raise one end onto a block. |
| `hands` | `'wide'`, `'narrow'`, `'staggered'`, `'archer'`, … | Grip variant. |
| `single` | boolean | Unilateral version. |
| `pose` | string | Select a named variant from the pattern. |

Unrecognised values fall back to the base pattern rather than throwing — a typo degrades to a generic pose, not a blank card.

## Exercises

The optional `posekit/exercises` export maps 178 named exercises onto patterns, so you have something to render on day one:

```ts
import { EXERCISES, getExercise } from 'posekit/exercises';

const e = getExercise('push-up');
// { slug, name, category, primary_muscles, animation_type, rig, rig_params, … }
```

Bring your own catalogue instead if you have one — the core has no opinion about what an exercise is.

## Theming

Every colour is emitted as a CSS custom property with the authored colour as its fallback, so the same markup themes in a browser and still renders correctly with no stylesheet at all:

```css
:root { --color-figure-leg: #3f5c37; --color-figure-load: #e08a2e; }
```

Or pass a `palette` to `toSVG` / `ExerciseFigure` to change the fallbacks directly.

## What it is not

- **Not anatomically accurate.** It is a schematic figure for demonstration, not a biomechanical model. It will not tell you anything true about joint torque.
- **Not medical advice, and not clinically validated.** If you are building anything that prescribes exercise, the clinical judgement is yours.
- **Not comprehensive.** 36 patterns of 61 specified. Exercises without a pattern render a fallback silhouette rather than failing.
- **Not a 3D rig.** Side and front views only.

## Tests

1,523 tests, and the ones that matter assert that the figure is a plausible human rather than that the code ran: bone lengths stay rigid across every pose, knees do not invert, straight-body patterns stay collinear within 4°, and the whole set of form invariants is re-checked across a swept range of motion. A shallower squat still has to be a squat.

```bash
npm test
```

## Licence

**GNU AGPL-3.0-or-later**, with a commercial exception available.

Plain English:

- **Use it yourself** — in a clinic, a gym, a classroom, a research project, any internal tool — free, no obligation.
- **Build something open** on it — free, provided your project is AGPL too.
- **Ship a closed-source product** on it — you need a [commercial licence](COMMERCIAL-LICENCE.md). Email <danieldeladzikunu@gmail.com>.

The AGPL asks one thing back: improvements to the rig return to everyone who uses it. That is the whole point of publishing it.

Be aware this is stronger than a typical open-source licence — AGPL reaches through imports, so an application bundling posekit must itself be AGPL or hold a commercial exception. If that does not suit you, say so and ask; non-profits, students and clinics in resource-constrained settings are not treated the same as a funded company.

No third-party exercise dataset, imagery or motion capture was used — every pattern and all 178 exercise entries are original work, so the only obligations here are posekit's own.

*Commits up to `74aeaac` were published under MIT; that grant stands for anyone who took a copy under it.*

## Contributing

Improvements to the movement patterns are the most useful thing you can send. A pattern is data — keyframes and named poses — so adding one needs no engine changes; see `src/patterns/` for 36 worked examples. 25 of the 61 specified patterns are still unauthored.

Every pattern must pass the form invariants in `src/form.test.ts`: bones stay rigid, knees do not invert, straight-body movements stay collinear. Run `npm test` before opening a pull request. Contributions are accepted under the AGPL.
