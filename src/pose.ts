import type { RigPattern, RigPose, Vec2 } from './types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/**
 * Bend is stepped, never interpolated. A fractional bend does not preserve bone
 * length — the IK places the joint at l1 from the root but then the segment to
 * the (fixed) end point is no longer l2, so a 31-long shin renders 9 units long
 * at bend 0. Stepping at the midpoint keeps every bone its authored length.
 */
const stepBend = (a: number, b: number, t: number) => (t < 0.5 ? a : b);

export function lerpPose(a: RigPose, b: RigPose, t: number): RigPose {
  return {
    hip: lerp2(a.hip, b.hip, t),
    torsoAngle: lerp(a.torsoAngle, b.torsoAngle, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    handR: lerp2(a.handR, b.handR, t),
    handL: lerp2(a.handL, b.handL, t),
    footR: lerp2(a.footR, b.footR, t),
    footL: lerp2(a.footL, b.footL, t),
    armBend: [
      stepBend(a.armBend[0], b.armBend[0], t),
      stepBend(a.armBend[1], b.armBend[1], t),
    ],
    legBend: [
      stepBend(a.legBend[0], b.legBend[0], t),
      stepBend(a.legBend[1], b.legBend[1], t),
    ],
  };
}

/**
 * The pose at a point in time, derived entirely from elapsedMs. There is no
 * mutable countdown anywhere: a decrementing counter drifts and is throttled
 * when the tab is backgrounded, which is exactly when a demonstration resumes.
 */
export function poseAt(pattern: RigPattern, elapsedMs: number): RigPose {
  const frames = pattern.keyframes;
  if (frames.length === 1) return frames[0];

  // A non-finite timestamp indexes the frame array with NaN and crashes the
  // whole figure. Fall back to the start of the movement.
  if (!Number.isFinite(elapsedMs)) return frames[0];

  const cycle = pattern.cycleMs;
  const wrapped = ((elapsedMs % cycle) + cycle) % cycle;
  const p = wrapped / cycle;

  if (pattern.loop === 'cycle') {
    const s = p * frames.length;
    const i = Math.floor(s) % frames.length;
    const raw = s - Math.floor(s);
    // Smooth each segment so the hard n→0 wrap doesn't read as a jolt.
    const t = 0.5 - 0.5 * Math.cos(Math.PI * raw);
    return lerpPose(frames[i], frames[(i + 1) % frames.length], t);
  }

  // Cosine easing at both ends is what reads as the natural pause at the top
  // and bottom of a rep. A linear ramp looks mechanical.
  let phase: number;
  if (pattern.ease === 'explosive') {
    const triangle = p < 0.5 ? p * 2 : (1 - p) * 2;
    phase = triangle * triangle;
  } else {
    phase = 0.5 - 0.5 * Math.cos(2 * Math.PI * p);
  }

  const s = phase * (frames.length - 1);
  const i = Math.min(Math.floor(s), frames.length - 2);
  return lerpPose(frames[i], frames[i + 1], s - i);
}
