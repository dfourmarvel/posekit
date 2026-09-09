import { describe, it } from 'vitest';
import type { AnimationType } from './types';
import { writeFileSync } from 'node:fs';
import data from './exercises/exercises.json';
import { poseAt } from './pose';
import { applyRigParams } from './params';
import { figureGeometry } from './draw';
import { PATTERNS } from './patterns';

type Row = {
  name: string;
  rig?: string;
  animation_type?: AnimationType;
  rig_params?: Record<string, unknown>;
};

const C = {
  outline: '#2f4a2a', head: '#f2eed8', arm: '#b9cf86',
  torso: '#8aa578', leg: '#3f5c37', load: '#e08a2e', ground: '#e2e8d8', prop: '#dfe6e1',
};
const W: Record<string, number> = {
  torso: 25, armR: 13, armL: 13, legR: 14, legL: 14,
  handR: 13, handL: 13, footR: 14, footL: 14,
};
const COLOR: Record<string, string> = {
  torso: C.torso, armR: C.arm, armL: C.arm, legR: C.leg, legL: C.leg,
  handR: C.leg, handL: C.leg, footR: C.leg, footL: C.leg,
};
const FAR = new Set(['armL', 'legL', 'handL', 'footL']);

function frame(row: Row, t: number): string {
  const r = applyRigParams(PATTERNS[row.rig as string], row.rig_params ?? {});
  const g = figureGeometry(poseAt(r, r.cycleMs * t), r);
  const order = ['armL', 'legL', 'handL', 'footL', 'torso', 'armR', 'legR', 'handR', 'footR'];
  // Props first, behind everything: a seated pattern that draws without its chair
  // reads as a figure crouching in mid-air, which is a review artefact rather
  // than a fault in the pose.
  let out = r.props
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" fill="${C.prop}"/>`)
    .join('');
  out += `<line x1="82" y1="172" x2="238" y2="172" stroke="${C.ground}" stroke-width="3"/>`;
  const stroke = (k: string, w: number, c: string, op: number) =>
    `<polyline fill="none" points="${g.bones[k]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
  for (const k of order) {
    if (r.hideFarArm && k === 'armL') continue;
    if (r.hideFarLeg && k === 'legL') continue;
    out += stroke(k, W[k] + 5, C.outline, FAR.has(k) ? 0.4 : 1);
  }
  for (const k of order) {
    if (r.hideFarArm && k === 'armL') continue;
    if (r.hideFarLeg && k === 'legL') continue;
    out += stroke(k, W[k], COLOR[k], FAR.has(k) ? 0.4 : 1);
  }
  if (g.load) out += stroke2(g.load);
  out += `<circle cx="${g.head[0]}" cy="${g.head[1]}" r="${15 + 2.5}" fill="${C.outline}"/>`;
  out += `<circle cx="${g.head[0]}" cy="${g.head[1]}" r="15" fill="${C.head}"/>`;
  return `<svg viewBox="80 8 160 178" width="150" height="167">${out}</svg>`;
}
const stroke2 = (p: string) =>
  `<polyline fill="none" points="${p}" stroke="${C.load}" stroke-width="6.5" stroke-linecap="round"/>`;

/**
 * A visual contact sheet, written only when asked for — same gating as
 * RIG_INSPECT above it, and for the same reason: the form invariants prove the
 * figure is a plausible human and cannot prove it reads as the right exercise.
 *
 *   RIG_SHEET=public/rig.html npx vitest run src/lib/rig/sheet.test.ts
 *   RIG_SHEET=public/rig.html RIG_SHEET_PATTERNS=squat,lunge npx vitest run src/lib/rig/sheet.test.ts
 *
 * Serve it rather than opening the file directly, so the dev server's theme
 * tokens resolve. Defaults to every registered pattern.
 */
describe('contact sheet', () => {
  it('writes the review sheet when RIG_SHEET names a path', () => {
    const out = process.env.RIG_SHEET;
    if (!out) return;
    const rows = (data as { exercises: Row[] }).exercises;
    const TOUCHED = (process.env.RIG_SHEET_PATTERNS ?? Object.keys(PATTERNS).join(',')).split(',');

    const sections = TOUCHED.map((id) => {
      const mine = rows.filter((e) => e.rig === id);
      const cards = mine
        .map((row) => {
          const r = applyRigParams(PATTERNS[id], row.rig_params ?? {}, row.animation_type);
          const n = r.keyframes.length;
          const stops = n > 2 ? [0, 0.25, 0.5] : [0, 0.5];
          return `<figure><figcaption><b>${row.name}</b><br><code>${JSON.stringify(row.rig_params ?? {})}</code></figcaption><div class="fr">${stops
            .map((t) => frame(row, t))
            .join('')}</div></figure>`;
        })
        .join('');
      return `<h2>${id}</h2><div class="grid">${cards}</div>`;
    }).join('');

    const html = `<!doctype html><meta charset="utf-8"><title>Rig pose review</title>
<style>
body{font:14px system-ui;margin:0;padding:24px;background:#f6f7f4;color:#22301f}
h1{margin:0 0 4px}p.sub{margin:0 0 24px;color:#5c6b57}
h2{margin:32px 0 12px;font-family:ui-monospace,monospace;font-size:15px;border-bottom:1px solid #d8e0d4;padding-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px}
figure{margin:0;background:#fff;border:1px solid #e3e8e0;border-radius:12px;padding:12px}
figcaption{margin-bottom:6px;line-height:1.4}
code{font-size:11px;color:#6b7a66}
.fr{display:flex;gap:4px}
svg{background:#fbfcfa;border-radius:8px;flex:1;min-width:0;height:auto}
</style>
<h1>Rig pose review</h1>
<p class="sub">Every exercise on each pattern, showing the start and mid-cycle frames (three for a 3-keyframe pose). Cards that look alike within a section are exercises still rendering identically — see docs/spec/SPEC-07-param-audit.md.</p>
${sections}`;
    writeFileSync(out, html);
    console.log(`wrote ${out}`);
  });
});
