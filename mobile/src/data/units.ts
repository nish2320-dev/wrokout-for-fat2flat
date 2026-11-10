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

/** Rewrites every stored weight (sets, weigh-ins, program weights) into the new unit. */
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
    // height and body measurements are stored in cm, so only the program's weights change
    program: s.program && {
      ...s.program,
      body: {
        ...s.program.body,
        startWeight: convert(s.program.body.startWeight, from, to),
        goalWeight: convert(s.program.body.goalWeight, from, to),
      },
    },
  };
}

const CM_PER_IN = 2.54;

/** Body measurements live in cm; lb users see inches. */
export const lengthUnit = (units: Units) => (units === 'lb' ? 'in' : 'cm');
export const cmToDisplay = (cm: number, units: Units) => (units === 'lb' ? cm / CM_PER_IN : cm);
export const displayToCm = (n: number, units: Units) => (units === 'lb' ? n * CM_PER_IN : n);
/** A measurement for display, one decimal at most. */
export const fmtLength = (cm: number, units: Units) => `${Math.round(cmToDisplay(cm, units) * 10) / 10}`;

/** Height as 5'10" for lb users, 178 cm otherwise. */
export function fmtHeight(cm: number, units: Units) {
  if (units === 'kg') return `${Math.round(cm)} cm`;
  const inches = Math.round(cm / CM_PER_IN);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

/** A weight for display: at most two decimals (22.25 kg plates), no trailing zeros. */
export const fmtWeight = (n: number) => `${Math.round(n * 100) / 100}`;
