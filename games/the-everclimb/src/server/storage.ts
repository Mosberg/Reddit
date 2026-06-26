import { redis } from '@devvit/web/server';

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const stringifyJson = (value: unknown): string => JSON.stringify(value);

export type StorageAdapter = {
  getJson: <T>(key: string) => Promise<T | null>;
  setJson: <T>(key: string, value: T) => Promise<void>;
};

export const createStorageAdapter = (): StorageAdapter => {
  return {
    getJson: async <T>(key: string): Promise<T | null> => {
      const raw = await redis.get(key);
      return parseJson<T>(raw);
    },
    setJson: async <T>(key: string, value: T): Promise<void> => {
      await redis.set(key, stringifyJson(value));
    },
  };
};
