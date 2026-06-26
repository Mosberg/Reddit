import { createTRPCUntypedClient, httpBatchLink } from '@trpc/client';
import type { LeaderboardEntry, PlayerProfile, RunSubmission } from '../../shared/types';

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
  updateCharacter: async (selectedCharacter: string): Promise<PlayerProfile> => {
    return client.mutation('profile.update', { selectedCharacter }) as Promise<PlayerProfile>;
  },
  submitRun: async (submission: RunSubmission): Promise<{ accepted: boolean; profile: PlayerProfile }> => {
    return client.mutation('leaderboard.submit', submission) as Promise<{
      accepted: boolean;
      profile: PlayerProfile;
    }>;
  },
  getLeaderboard: async (mode: string): Promise<LeaderboardEntry[]> => {
    return client.query('leaderboard.top', { mode }) as Promise<LeaderboardEntry[]>;
  },
};
