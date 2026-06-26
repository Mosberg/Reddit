import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { context, reddit } from '@devvit/web/server';
import {
  characterIds,
  gameModes,
  type CharacterId,
  type GameMode,
  type LeaderboardEntry,
  type PlayerProfile,
} from '../shared/types';
import { createStorageAdapter } from './storage';

const t = initTRPC.create();

const storage = createStorageAdapter();

const defaultProfile = (): PlayerProfile => ({
  selectedCharacter: 'rex-rafter',
  bestFloor: 0,
  bestCombo: 0,
  totalFloors: 0,
  totalCombos: 0,
  playtimeSeconds: 0,
});

const leaderboardKey = (mode: GameMode): string => `leaderboard/${mode}`;
const profileKey = (username: string): string => `profiles/${username}`;

const getCurrentUsername = async (): Promise<string> => {
  const username = await reddit.getCurrentUsername();
  return username?.trim() ? username : 'anonymous';
};

const getProfile = async (username: string): Promise<PlayerProfile> => {
  const stored = await storage.getJson<PlayerProfile>(profileKey(username));
  return stored ?? defaultProfile();
};

const putProfile = async (username: string, profile: PlayerProfile): Promise<void> => {
  await storage.setJson(profileKey(username), profile);
};

const sortAndTrim = (rows: LeaderboardEntry[]): LeaderboardEntry[] => {
  return rows
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.floor !== a.floor) return b.floor - a.floor;
      if (b.combo !== a.combo) return b.combo - a.combo;
      return a.createdAt - b.createdAt;
    })
    .slice(0, 10);
};

const characterIdSchema = z.enum(characterIds);
const gameModeSchema = z.enum(gameModes);

const runInputSchema = z.object({
  mode: gameModeSchema,
  score: z.number().int().nonnegative(),
  floor: z.number().int().nonnegative(),
  combo: z.number().int().nonnegative(),
  character: characterIdSchema,
  playtimeSeconds: z.number().nonnegative(),
});

export const appRouter = t.router({
  profile: t.router({
    get: t.procedure.query(async () => {
      const username = await getCurrentUsername();
      return getProfile(username);
    }),
    update: t.procedure
      .input(z.object({ selectedCharacter: characterIdSchema }))
      .mutation(async ({ input }) => {
        const username = await getCurrentUsername();
        const profile = await getProfile(username);
        const next: PlayerProfile = { ...profile, selectedCharacter: input.selectedCharacter };
        await putProfile(username, next);
        return next;
      }),
  }),
  leaderboard: t.router({
    submit: t.procedure.input(runInputSchema).mutation(async ({ input }) => {
      const username = await getCurrentUsername();
      const postScope = context.postId ? `${context.postId}:` : '';
      const entry: LeaderboardEntry = {
        userId: `${postScope}${username}`,
        username,
        score: input.score,
        floor: input.floor,
        combo: input.combo,
        character: input.character,
        mode: input.mode,
        createdAt: Date.now(),
      };

      const key = leaderboardKey(input.mode);
      const rows = (await storage.getJson<LeaderboardEntry[]>(key)) ?? [];
      const merged = sortAndTrim([...rows, entry]);
      await storage.setJson(key, merged);

      const profile = await getProfile(username);
      const nextProfile: PlayerProfile = {
        ...profile,
        selectedCharacter: input.character,
        bestFloor: Math.max(profile.bestFloor, input.floor),
        bestCombo: Math.max(profile.bestCombo, input.combo),
        totalFloors: profile.totalFloors + input.floor,
        totalCombos: profile.totalCombos + input.combo,
        playtimeSeconds: profile.playtimeSeconds + Math.round(input.playtimeSeconds),
      };

      await putProfile(username, nextProfile);
      return { accepted: true, profile: nextProfile, entry };
    }),
    top: t.procedure
      .input(z.object({ mode: gameModeSchema.optional() }).optional())
      .query(async ({ input }) => {
        const mode = input?.mode ?? 'classic';
        return (await storage.getJson<LeaderboardEntry[]>(leaderboardKey(mode))) ?? [];
      }),
  }),
  stats: t.router({
    increment: t.procedure
      .input(
        z.object({
          floors: z.number().int().nonnegative().default(0),
          combos: z.number().int().nonnegative().default(0),
          playtimeSeconds: z.number().nonnegative().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const username = await getCurrentUsername();
        const profile = await getProfile(username);
        const next: PlayerProfile = {
          ...profile,
          totalFloors: profile.totalFloors + input.floors,
          totalCombos: profile.totalCombos + input.combos,
          playtimeSeconds: profile.playtimeSeconds + Math.round(input.playtimeSeconds),
        };
        await putProfile(username, next);
        return next;
      }),
  }),
});

export type AppRouter = typeof appRouter;

export const trpcPath = '/api/trpc';

export const isCharacterId = (value: string): value is CharacterId => {
  return (characterIds as readonly string[]).includes(value);
};
