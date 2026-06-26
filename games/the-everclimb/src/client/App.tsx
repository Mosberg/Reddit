import { useCallback, useEffect, useMemo, useState } from 'react';
import { context } from '@devvit/web/client';
import { GameCanvas } from './GameCanvas';
import { everclimbApi } from './lib/trpcClient';
import { challengeDefinitions } from '../shared/challenges';
import {
  characters,
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0b486b_0%,#0a2f44_42%,#001220_100%)] px-3 py-4 text-cyan-50 sm:px-6">
      <GameCanvas
        view={view}
        menuTab={menuTab}
        leaderboardScope={leaderboardScope}
        mode={mode}
        character={selectedCharacter}
        challenge={activeChallenge}
        challengeDefinitions={challengeDefinitions}
        settings={settings}
        replay={pendingReplay}
        isPaused={runFinished}
        resetToken={resetToken}
        hasReplay={!!lastReplay}
        liveState={liveState}
        timeLeft={timeLeft}
        profile={profile}
        loadingProfile={loadingProfile}
        unlockedAchievements={unlockedAchievements}
        pilotName={selectedCharacterMeta.name}
        pilotAccent={selectedCharacterMeta.accent}
        activeUsername={username}
        leaderboardRows={leaderboardRows}
        localRows={localRows}
        leaderboardLoading={loadingLeaderboard}
        onModeChange={(entry) => {
          setMode(entry);
          if (entry === 'challenge' && !activeChallengeId) {
            setActiveChallengeId(challengeDefinitions[0]?.id ?? null);
          }
        }}
        onChallengeSelect={setActiveChallengeId}
        onMenuTabChange={setMenuTab}
        onLeaderboardScopeChange={setLeaderboardScope}
        onStartRun={startRun}
        onStartReplay={startReplay}
        onCharacterSelect={handleCharacterSelect}
        onSettingsChange={handleSettingsChange}
        onResetData={handleResetAllData}
        onState={setLiveState}
        onMainMenu={() => {
          setView('menu');
          setRunFinished(true);
        }}
        onRestart={restart}
        onPauseToggle={togglePause}
        onRunEnd={handleRunEnd}
      />
    </div>
  );
};
