import type { AnimationType, RigParams } from '../types';
import raw from './exercises.json';

/**
 * A catalogued exercise and the pattern that draws it.
 *
 * This export is optional and deliberately separate: the geometry core has no
 * opinion about what an exercise is, and a caller with their own catalogue
 * should map their own rows onto `rig` + `rigParams` rather than adopt this
 * shape. It is here because a pattern registry with no mapping is hard to use
 * on day one.
 *
 * All 178 entries are original work — no third-party exercise dataset was used,
 * so nothing here carries an attribution or share-alike obligation.
 */
export type Exercise = {
  slug: string;
  name: string;
  /** Alternate names people search by. */
  aka?: string[];
  category: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  difficulty: string;
  measure: string;
  equipment: string[];
  exercise_type: string;
  movement_pattern?: string;
  body_position?: string;
  laterality?: string;
  /** Whether the movement reps, is held, or runs for a time. */
  animation_type: AnimationType;
  /** The `PATTERNS` key that draws it. */
  rig: string;
  /** Passed straight to `applyRigParams`. */
  rig_params?: RigParams;
};

export const EXERCISES: readonly Exercise[] = raw as unknown as readonly Exercise[];

const BY_SLUG = new Map(EXERCISES.map((e) => [e.slug, e]));

export function getExercise(slug: string): Exercise | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Case-insensitive match over name and alternate names. */
export function findExercises(query: string): Exercise[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return EXERCISES.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      (e.aka ?? []).some((a) => a.toLowerCase().includes(q)),
  );
}
