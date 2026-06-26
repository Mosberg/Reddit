import type { PlayerProfile, RunSummary } from './types';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  isUnlocked: (profile: PlayerProfile, run: RunSummary | null) => boolean;
};

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'first_climb',
    title: 'First Climb',
    description: 'Reach floor 50.',
    isUnlocked: (profile) => profile.bestFloor >= 50,
  },
  {
    id: 'high_climb',
    title: 'Getting High',
    description: 'Reach floor 200.',
    isUnlocked: (profile) => profile.bestFloor >= 200,
  },
  {
    id: 'cloudbreaker',
    title: 'Cloudbreaker',
    description: 'Reach floor 500.',
    isUnlocked: (profile) => profile.bestFloor >= 500,
  },
  {
    id: 'legend',
    title: 'Legend',
    description: 'Reach floor 1000.',
    isUnlocked: (profile) => profile.bestFloor >= 1000,
  },
  {
    id: 'combo_apprentice',
    title: 'Combo Apprentice',
    description: 'Land a combo of 5 or more.',
    isUnlocked: (profile) => profile.bestCombo >= 5,
  },
  {
    id: 'combo_master',
    title: 'Combo Master',
    description: 'Land a combo of 20 or more.',
    isUnlocked: (profile) => profile.bestCombo >= 20,
  },
  {
    id: 'persistent',
    title: 'Persistent',
    description: 'Complete 5 runs.',
    isUnlocked: (profile) => profile.runsPlayed >= 5,
  },
  {
    id: 'survivor',
    title: 'Survivor',
    description: 'Survive at least 60 seconds in one run.',
    isUnlocked: (_profile, run) => (run?.playtimeSeconds ?? 0) >= 60,
  },
];

export const unlockAchievements = (
  profile: PlayerProfile,
  run: RunSummary | null
): { unlocked: string[]; allUnlocked: string[] } => {
  const unlockedNow = new Set(profile.unlockedAchievements);
  const newlyUnlocked: string[] = [];

  for (const achievement of achievementDefinitions) {
    if (unlockedNow.has(achievement.id)) {
      continue;
    }
    if (achievement.isUnlocked(profile, run)) {
      unlockedNow.add(achievement.id);
      newlyUnlocked.push(achievement.id);
    }
  }

  return { unlocked: newlyUnlocked, allUnlocked: [...unlockedNow] };
};
