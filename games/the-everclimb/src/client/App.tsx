import { useCallback, useEffect, useMemo, useState } from 'react';
import { context } from '@devvit/web/client';
import { CharacterSelect } from './CharacterSelect';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { Leaderboard } from './Leaderboard';
import { everclimbApi } from './lib/trpcClient';
import { characters, gameModes, type CharacterId, type GameMode, type LiveGameState } from '../shared/types';

const initialLiveState: LiveGameState = {
  score: 0,
  floor: 0,
  combo: 0,
  comboTimer: 0,
  risingProgress: 0,
  elapsedSeconds: 0,
};

export const App = () => {
  const [mode, setMode] = useState<GameMode>('classic');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('rex-rafter');
  const [leaderboardRows, setLeaderboardRows] = useState<Array<{
    userId: string;
    username: string;
    score: number;
    floor: number;
    combo: number;
    character: CharacterId;
    mode: GameMode;
    createdAt: number;
  }>>([]);
  const [liveState, setLiveState] = useState<LiveGameState>(initialLiveState);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [runFinished, setRunFinished] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const username = context.username ?? null;

  const selectedCharacterMeta = useMemo(() => {
    return characters.find((entry) => entry.id === selectedCharacter) ?? characters[0];
  }, [selectedCharacter]);

  const loadLeaderboard = useCallback(async (nextMode: GameMode) => {
    setLoadingLeaderboard(true);
    try {
      const rows = await everclimbApi.getLeaderboard(nextMode);
      setLeaderboardRows(rows as typeof leaderboardRows);
    } catch (error) {
      console.error('Failed to load leaderboard', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await everclimbApi.getProfile();
        setSelectedCharacter(profile.selectedCharacter);
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoadingProfile(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    void loadLeaderboard(mode);
  }, [mode, loadLeaderboard]);

  useEffect(() => {
    if (mode !== 'timeattack') {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(Math.max(0, 90 - liveState.elapsedSeconds));
  }, [mode, liveState]);

  const handleCharacterSelect = useCallback(
    async (id: CharacterId) => {
      setSelectedCharacter(id);
      try {
        await everclimbApi.updateCharacter(id);
      } catch (error) {
        console.error('Failed to update character', error);
      }
    },
    []
  );

  const handleRunEnd = useCallback(
    async (result: { score: number; floor: number; combo: number; playtimeSeconds: number }) => {
      if (runFinished) {
        return;
      }
      setRunFinished(true);
      try {
        await everclimbApi.submitRun({
          mode,
          score: result.score,
          floor: result.floor,
          combo: result.combo,
          character: selectedCharacter,
          playtimeSeconds: result.playtimeSeconds,
        });
        await loadLeaderboard(mode);
      } catch (error) {
        console.error('Failed to submit run', error);
      }
    },
    [loadLeaderboard, mode, runFinished, selectedCharacter]
  );

  const restart = useCallback(() => {
    setRunFinished(false);
    setLiveState(initialLiveState);
    setResetToken((value) => value + 1);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fdedcf_0%,#c7ebff_52%,#99c5ff_100%)] px-3 py-4 text-slate-800 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3">
          <header className="rounded-2xl border border-black/10 bg-white/75 p-3 backdrop-blur-sm">
            <h1 className="text-2xl font-black tracking-tight">The Everclimb</h1>
            <p className="text-xs text-slate-600">
              Climb endlessly, chain floor skips, and outrun the Rising Pulse.
            </p>
          </header>

          <HUD
            mode={mode}
            score={liveState.score}
            floor={liveState.floor}
            combo={liveState.combo}
            comboTimer={liveState.comboTimer}
            risingProgress={liveState.risingProgress}
            timeLeft={timeLeft}
          />

          <GameCanvas
            mode={mode}
            character={selectedCharacter}
            isPaused={runFinished}
            resetToken={resetToken}
            onState={setLiveState}
            onRunEnd={handleRunEnd}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={restart}
              className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Restart Run
            </button>
            <button
              type="button"
              onClick={() => setRunFinished((value) => !value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              {runFinished ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <section className="rounded-2xl border border-white/40 bg-white/75 p-3 backdrop-blur-sm">
            <div className="mb-2 flex flex-wrap gap-2">
              {gameModes.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setMode(entry);
                    restart();
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    mode === entry
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:ring-slate-500'
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600">
              Pilot: <span className="font-semibold" style={{ color: selectedCharacterMeta.accent }}>{selectedCharacterMeta.name}</span>
              {username ? ` • ${username}` : ''}
            </p>
          </section>

          <CharacterSelect
            selected={selectedCharacter}
            onSelect={handleCharacterSelect}
            disabled={loadingProfile}
          />

          <Leaderboard
            mode={mode}
            rows={leaderboardRows}
            activeUsername={username}
            loading={loadingLeaderboard}
          />
        </div>
      </div>
    </div>
  );
};
