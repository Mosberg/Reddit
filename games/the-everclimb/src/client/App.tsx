import { useCallback, useEffect, useMemo, useState } from 'react';
import { context } from '@devvit/web/client';
import { CharacterSelect } from './CharacterSelect';
import { GameCanvas } from './GameCanvas';
import { HUD } from './HUD';
import { Leaderboard } from './Leaderboard';
import { AchievementsPanel } from './AchievementsPanel';
import { ProfileStats } from './ProfileStats';
import { SettingsPanel } from './SettingsPanel';
import { everclimbApi } from './lib/trpcClient';
import { challengeDefinitions } from '../shared/challenges';
import {
  characters,
  gameModes,
  type ChallengeDefinition,
  type CharacterId,
  type CharacterMeta,
  type GameSettings,
  type GameMode,
  type LiveGameState,
  type PlayerProfile,
  type ReplayRecording,
} from '../shared/types';

const initialLiveState: LiveGameState = {
  score: 0,
  floor: 0,
  combo: 0,
  comboTimer: 0,
  comboText: null,
  risingProgress: 0,
  elapsedSeconds: 0,
  modeCompleted: false,
};

const defaultSettings: GameSettings = {
  soundEnabled: true,
  screenShakeEnabled: true,
  comboTextEnabled: true,
  tutorialHintsEnabled: true,
  showGhostRuns: false,
  gamepadEnabled: true,
  gamepadDeadzone: 0.25,
  keybindings: {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    jump: 'Space',
    pause: 'Escape',
    run: 'ShiftLeft',
  },
};

type LocalScoreRow = {
  userId: string;
  username: string;
  score: number;
  floor: number;
  combo: number;
  character: CharacterId;
  mode: GameMode;
  createdAt: number;
};

const defaultCharacterMeta: CharacterMeta = {
  id: 'rex-rafter',
  name: 'Rex Rafter',
  blurb: 'Momentum stunt climber',
  accent: '#fd6f2d',
};

export const App = () => {
  const [view, setView] = useState<'menu' | 'play'>('menu');
  const [menuTab, setMenuTab] = useState<
    'home' | 'characters' | 'achievements' | 'leaderboards' | 'settings'
  >('home');
  const [mode, setMode] = useState<GameMode>('classic');
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(
    null
  );
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterId>('rex-rafter');
  const [leaderboardRows, setLeaderboardRows] = useState<LocalScoreRow[]>([]);
  const [liveState, setLiveState] = useState<LiveGameState>(initialLiveState);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [runFinished, setRunFinished] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(
    []
  );
  const [localRows, setLocalRows] = useState<LocalScoreRow[]>([]);
  const [leaderboardScope, setLeaderboardScope] = useState<'online' | 'local'>(
    'online'
  );
  const [lastReplay, setLastReplay] = useState<ReplayRecording | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = window.localStorage.getItem('everclimb-last-replay');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ReplayRecording;
    } catch {
      return null;
    }
  });
  const [pendingReplay, setPendingReplay] = useState<ReplayRecording | null>(
    null
  );

  const username = context.username ?? null;

  const activeChallenge: ChallengeDefinition | null = useMemo(() => {
    if (mode !== 'challenge') {
      return null;
    }
    return (
      challengeDefinitions.find(
        (challenge) => challenge.id === activeChallengeId
      ) ??
      challengeDefinitions[0] ??
      null
    );
  }, [activeChallengeId, mode]);

  const selectedChallengeId = activeChallenge?.id;
  const timeLimit = activeChallenge?.timeLimitSeconds ?? 60;
  const timeLeft =
    mode === 'timeattack'
      ? Math.max(0, timeLimit - liveState.elapsedSeconds)
      : null;

  const selectedCharacterMeta = useMemo(() => {
    return (
      characters.find((entry) => entry.id === selectedCharacter) ??
      defaultCharacterMeta
    );
  }, [selectedCharacter]);

  const loadLocalLeaderboard = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem('everclimb-local-leaderboard');
    if (!raw) {
      setLocalRows([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as LocalScoreRow[];
      setLocalRows(
        parsed
          .filter((row) => row.mode === mode)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
      );
    } catch {
      setLocalRows([]);
    }
  }, [mode]);

  const saveLocalRun = useCallback(
    (result: {
      score: number;
      floor: number;
      combo: number;
      playtimeSeconds: number;
    }) => {
      if (typeof window === 'undefined') {
        return;
      }
      const raw = window.localStorage.getItem('everclimb-local-leaderboard');
      const existing: LocalScoreRow[] = raw
        ? (JSON.parse(raw) as LocalScoreRow[])
        : [];
      const row: LocalScoreRow = {
        userId: username ?? 'local-user',
        username: username ?? 'Climber',
        score: result.score,
        floor: result.floor,
        combo: result.combo,
        character: selectedCharacter,
        mode,
        createdAt: Date.now(),
      };
      const merged = [...existing, row]
        .sort((a, b) => b.score - a.score)
        .slice(0, 40);
      window.localStorage.setItem(
        'everclimb-local-leaderboard',
        JSON.stringify(merged)
      );
      loadLocalLeaderboard();
    },
    [loadLocalLeaderboard, mode, selectedCharacter, username]
  );

  const loadLeaderboard = useCallback(async (nextMode: GameMode) => {
    setLoadingLeaderboard(true);
    try {
      const rows = await everclimbApi.getLeaderboard(nextMode);
      setLeaderboardRows(rows as LocalScoreRow[]);
    } catch (error) {
      console.error('Failed to load leaderboard', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const nextProfile = await everclimbApi.getProfile();
        const achievements = await everclimbApi.getAchievements();
        setSelectedCharacter(nextProfile.selectedCharacter);
        setSettings(nextProfile.settings ?? defaultSettings);
        setProfile(nextProfile);
        setUnlockedAchievements(achievements);
        loadLocalLeaderboard();
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoadingProfile(false);
      }
    };
    void load();
  }, [loadLocalLeaderboard]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLeaderboard(mode);
    loadLocalLeaderboard();
  }, [mode, loadLeaderboard, loadLocalLeaderboard]);

  const handleCharacterSelect = useCallback(
    async (id: CharacterId) => {
      const requiredFloor =
        characters.find((character) => character.id === id)?.unlockFloor ?? 0;
      if ((profile?.bestFloor ?? 0) < requiredFloor) {
        return;
      }
      setSelectedCharacter(id);
      try {
        await everclimbApi.updateCharacter(id);
      } catch (error) {
        console.error('Failed to update character', error);
      }
    },
    [profile?.bestFloor]
  );

  const handleSettingsChange = useCallback(async (next: GameSettings) => {
    setSettings(next);
    try {
      const updated = await everclimbApi.updateSettings(next);
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update settings', error);
    }
  }, []);

  const handleResetAllData = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Reset all local and profile game data?'
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      const resetProfile = await everclimbApi.resetData();
      setProfile(resetProfile);
      setSettings(resetProfile.settings);
      setUnlockedAchievements([]);
      setLiveState(initialLiveState);
      setRunFinished(false);
      setResetToken((value) => value + 1);
      setLeaderboardRows([]);

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('everclimb-local-leaderboard');
        window.localStorage.removeItem('everclimb-last-replay');
      }
      setLastReplay(null);
      loadLocalLeaderboard();
      await loadLeaderboard(mode);
    } catch (error) {
      console.error('Failed to reset data', error);
    }
  }, [loadLeaderboard, loadLocalLeaderboard, mode]);

  const handleRunEnd = useCallback(
    async (result: {
      score: number;
      floor: number;
      combo: number;
      playtimeSeconds: number;
      replay?: ReplayRecording;
      isReplay?: boolean;
    }) => {
      if (runFinished) {
        return;
      }
      setRunFinished(true);

      if (result.replay) {
        setLastReplay(result.replay);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'everclimb-last-replay',
            JSON.stringify(result.replay)
          );
        }
      }

      if (result.isReplay) {
        return;
      }

      saveLocalRun(result);
      try {
        const submission = {
          mode,
          score: result.score,
          floor: result.floor,
          combo: result.combo,
          character: selectedCharacter,
          playtimeSeconds: result.playtimeSeconds,
          ...(selectedChallengeId ? { challengeId: selectedChallengeId } : {}),
          ...(mode === 'challenge'
            ? { modeCompleted: liveState.modeCompleted }
            : {}),
        };

        const response = await everclimbApi.submitRun(submission);
        setProfile(response.profile);
        if (response.newlyUnlockedAchievements.length > 0) {
          setUnlockedAchievements(response.profile.unlockedAchievements);
        }
        await loadLeaderboard(mode);
      } catch (error) {
        console.error('Failed to submit run', error);
      }
    },
    [
      liveState.modeCompleted,
      loadLeaderboard,
      mode,
      runFinished,
      saveLocalRun,
      selectedChallengeId,
      selectedCharacter,
    ]
  );

  const restart = useCallback(() => {
    setRunFinished(false);
    setLiveState(initialLiveState);
    setResetToken((value) => value + 1);
  }, []);

  const togglePause = useCallback(() => {
    setRunFinished((value) => !value);
  }, []);

  const startRun = useCallback(() => {
    setPendingReplay(null);
    restart();
    setView('play');
  }, [restart]);

  const startReplay = useCallback(() => {
    if (!lastReplay) {
      return;
    }
    setPendingReplay(lastReplay);
    restart();
    setView('play');
  }, [lastReplay, restart]);

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0b486b_0%,#0a2f44_42%,#001220_100%)] px-3 py-4 text-cyan-50 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-3">
          <header className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-4 backdrop-blur-sm">
            <h1 className="text-3xl font-black tracking-tight text-sky-300 [text-shadow:2px_2px_0_rgba(1,87,155,0.9)]">
              The Everclimb
            </h1>
            <p className="text-sm text-cyan-100/90">
              Endless vertical platforming with momentum jumps, combos, and
              rising-floor pressure.
            </p>
          </header>

          <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-3 backdrop-blur-sm">
            <div className="mb-2 flex flex-wrap gap-2">
              {gameModes.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setMode(entry);
                    if (entry === 'challenge' && !activeChallengeId) {
                      setActiveChallengeId(challengeDefinitions[0]?.id ?? null);
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    mode === entry
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900/70 text-cyan-100 ring-1 ring-cyan-200/20 hover:ring-cyan-200/60'
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>

            {mode === 'challenge' ? (
              <div className="mt-2 grid gap-2">
                {challengeDefinitions.map((challenge) => (
                  <button
                    key={challenge.id}
                    type="button"
                    onClick={() => setActiveChallengeId(challenge.id)}
                    className={`rounded-lg px-2 py-1 text-left text-xs ${
                      activeChallenge?.id === challenge.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-900/70 text-cyan-100 ring-1 ring-cyan-200/20 hover:ring-cyan-200/60'
                    }`}
                  >
                    <div className="font-semibold">{challenge.name}</div>
                    <div className="opacity-80">{challenge.description}</div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startRun}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Start Run
              </button>
              <button
                type="button"
                onClick={startReplay}
                disabled={!lastReplay}
                className="rounded-xl border border-cyan-200/20 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50"
              >
                Watch Last Replay
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-3 backdrop-blur-sm">
            <div className="mb-3 flex flex-wrap gap-2">
              {(
                [
                  'home',
                  'characters',
                  'achievements',
                  'leaderboards',
                  'settings',
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMenuTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold uppercase ${
                    menuTab === tab
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900/70 text-cyan-100 ring-1 ring-cyan-200/20'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {menuTab === 'home' ? <ProfileStats profile={profile} /> : null}
            {menuTab === 'characters' ? (
              <CharacterSelect
                selected={selectedCharacter}
                onSelect={handleCharacterSelect}
                bestFloor={profile?.bestFloor ?? 0}
                disabled={loadingProfile}
              />
            ) : null}
            {menuTab === 'achievements' ? (
              <AchievementsPanel unlocked={unlockedAchievements} />
            ) : null}
            {menuTab === 'leaderboards' ? (
              <div>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaderboardScope('online')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      leaderboardScope === 'online'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-900/70 text-cyan-100 ring-1 ring-cyan-200/20'
                    }`}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardScope('local')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      leaderboardScope === 'local'
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-900/70 text-cyan-100 ring-1 ring-cyan-200/20'
                    }`}
                  >
                    Local
                  </button>
                </div>
                <Leaderboard
                  mode={mode}
                  rows={
                    leaderboardScope === 'online' ? leaderboardRows : localRows
                  }
                  activeUsername={username}
                  loading={
                    leaderboardScope === 'online' ? loadingLeaderboard : false
                  }
                />
              </div>
            ) : null}
            {menuTab === 'settings' ? (
              <SettingsPanel
                settings={settings}
                onChange={handleSettingsChange}
                onResetData={handleResetAllData}
              />
            ) : null}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0b486b_0%,#0a2f44_42%,#001220_100%)] px-3 py-4 text-cyan-50 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3">
          <header className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-3 backdrop-blur-sm">
            <h1 className="text-2xl font-black tracking-tight text-sky-300 [text-shadow:2px_2px_0_rgba(1,87,155,0.9)]">
              The Everclimb
            </h1>
            <p className="text-xs text-cyan-100/85">
              Climb endlessly, chain floor skips, and outrun the Rising Pulse.
            </p>
          </header>

          <HUD
            mode={mode}
            score={liveState.score}
            floor={liveState.floor}
            combo={liveState.combo}
            comboTimer={liveState.comboTimer}
            comboText={liveState.comboText}
            risingProgress={liveState.risingProgress}
            timeLeft={timeLeft}
            modeCompleted={liveState.modeCompleted}
          />

          <GameCanvas
            mode={mode}
            character={selectedCharacter}
            challenge={activeChallenge}
            settings={settings}
            replay={pendingReplay}
            isPaused={runFinished}
            resetToken={resetToken}
            onState={setLiveState}
            onPauseToggle={togglePause}
            onRunEnd={handleRunEnd}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setView('menu');
                setRunFinished(true);
              }}
              className="rounded-xl border border-cyan-200/20 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-300/70"
            >
              Main Menu
            </button>
            <button
              type="button"
              onClick={restart}
              className="flex-1 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Restart Run
            </button>
            <button
              type="button"
              onClick={togglePause}
              className="rounded-xl border border-cyan-200/20 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-300/70"
            >
              {runFinished ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <section className="rounded-2xl border border-cyan-200/20 bg-slate-950/55 p-3 backdrop-blur-sm">
            <p className="text-xs text-cyan-100/85">
              Pilot:{' '}
              <span
                className="font-semibold"
                style={{ color: selectedCharacterMeta.accent }}
              >
                {selectedCharacterMeta.name}
              </span>
              {username ? ` • ${username}` : ''}
            </p>
          </section>

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
