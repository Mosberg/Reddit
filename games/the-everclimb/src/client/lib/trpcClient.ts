import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client';
import type {
  GameSettings,
  LeaderboardEntry,
  PlayerProfile,
  RunSubmission,
} from '../../shared/types';

const client = createTRPCUntypedClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
    }),
  ],
});

export const everclimbApi = {
  getProfile: async (): Promise<PlayerProfile> => {
    return client.query('profile.get') as Promise<PlayerProfile>;
  },
  updateCharacter: async (
    selectedCharacter: string
  ): Promise<PlayerProfile> => {
    return client.mutation('profile.update', {
      selectedCharacter,
    }) as Promise<PlayerProfile>;
  },
  updateSettings: async (settings: GameSettings): Promise<PlayerProfile> => {
    return client.mutation(
      'profile.updateSettings',
      settings
    ) as Promise<PlayerProfile>;
  },
  getAchievements: async (): Promise<string[]> => {
    return client.query('profile.achievements') as Promise<string[]>;
  },
  resetData: async (): Promise<PlayerProfile> => {
    return client.mutation('profile.resetData') as Promise<PlayerProfile>;
  },
  submitRun: async (
    submission: RunSubmission
  ): Promise<{
    accepted: boolean;
    profile: PlayerProfile;
    newlyUnlockedAchievements: string[];
  }> => {
    return client.mutation('leaderboard.submit', submission) as Promise<{
      accepted: boolean;
      profile: PlayerProfile;
      newlyUnlockedAchievements: string[];
    }>;
  },
  getLeaderboard: async (mode: string): Promise<LeaderboardEntry[]> => {
    return client.query('leaderboard.top', { mode }) as Promise<
      LeaderboardEntry[]
    >;
  },
};
