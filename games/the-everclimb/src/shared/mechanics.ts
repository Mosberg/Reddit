import type { GameMode } from './types';

export type ComboState = {
  chain: number;
  timer: number;
  maxChain: number;
};

export const comboDurationSeconds = 2.1;

export const risingSpeedForMode = (mode: GameMode): number => {
  switch (mode) {
    case 'timeattack':
      return 58;
    case 'challenge':
      return 45;
    case 'practice':
      return 0;
    case 'classic':
    default:
      return 35;
  }
};

export const computeCombo = (
  prev: ComboState,
  skippedFloors: number,
  dt: number
): ComboState => {
  const timer = Math.max(0, prev.timer - dt);
  const expired = timer <= 0;
  const nextBase = expired ? { chain: 0, timer: 0, maxChain: prev.maxChain } : { ...prev, timer };

  if (skippedFloors >= 2) {
    const chain = nextBase.chain + 1;
    return {
      chain,
      timer: comboDurationSeconds,
      maxChain: Math.max(prev.maxChain, chain),
    };
  }

  return nextBase;
};

export const comboMultiplier = (combo: number): number => {
  return 1 + Math.min(combo * 0.2, 2.4);
};

export const scoreForLanding = (floorGain: number, combo: number): number => {
  const base = Math.max(floorGain, 1) * 120;
  return Math.round(base * comboMultiplier(combo));
};
