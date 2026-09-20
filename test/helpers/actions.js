// Action builders and a replay helper for the run-state tests.
import { reduce } from '../../js/core/run-state.js';

export const cmd = (command, at = 0) => ({ type: 'command', command, at });
export const mat = (state, at = 0) => ({ type: 'mat', state, at });

export function apply(state, ...actions) {
  return actions.reduce(reduce, state);
}

// Feeds a scenario's mat steps and timed operator commands through the reducer in time order,
// each stamped with `start + t`. At equal times the mat step goes first.
export function replay(state, { steps = [], commands = [] }, start = 0) {
  const timeline = [
    ...steps.map(({ t, state: m }) => ({ t, action: { type: 'mat', state: m } })),
    ...commands.map(({ t, command }) => ({ t, action: { type: 'command', command } })),
  ].sort((a, b) => a.t - b.t);
  return timeline.reduce((s, { t, action }) => reduce(s, { ...action, at: start + t }), state);
}
