import { AppState, Profile } from './types';

export type Units = Profile['units'];

const LB_PER_KG = 2.20462262;

/**
 * Converted weights are stored unrounded so switching units back and forth
 * never drifts the history (rounding each time turns 90 lb into 89.99).
 * Rounding happens only for display, in fmtWeight.
 */
const convert = (n: number, from: Units, to: Units) => {
  if (from === to || n === 0) return n;
  return to === 'kg' ? n / LB_PER_KG : n * LB_PER_KG;
};

/** Rewrites every stored weight (sets and weigh-ins) into the new unit. */
export function convertUnits(s: AppState, to: Units): AppState {
  const from = s.profile.units;
  if (from === to) return s;
  return {
    ...s,
    profile: { ...s.profile, units: to },
    workouts: s.workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((set) => ({ ...set, weight: convert(set.weight, from, to) })),
      })),
    })),
    weighIns: s.weighIns.map((x) => ({ ...x, weight: convert(x.weight, from, to) })),
  };
}

/** A weight for display: at most two decimals (22.25 kg plates), no trailing zeros. */
export const fmtWeight = (n: number) => `${Math.round(n * 100) / 100}`;
