import type { ChallengeDefinition } from './types';

export const challengeDefinitions: ChallengeDefinition[] = [
  {
    id: 'floor_100_sprint',
    name: 'Floor 100 Sprint',
    description: 'Reach floor 100 before the void catches you.',
    targetFloor: 100,
  },
  {
    id: 'combo_master_20',
    name: 'Combo Master 20',
    description: 'Chain a 20+ combo in a single run.',
    targetCombo: 20,
  },
  {
    id: 'score_rush_5k_60s',
    name: 'Score Rush 5k',
    description: 'Score 5,000 points within 60 seconds.',
    targetScore: 5000,
    timeLimitSeconds: 60,
  },
];

export const challengeById = (
  id: string | null | undefined
): ChallengeDefinition | null => {
  if (!id) {
    return null;
  }
  return challengeDefinitions.find((challenge) => challenge.id === id) ?? null;
};
