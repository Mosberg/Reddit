export const characterIds = [
  'rex-rafter',
  'vexa-voltstride',
  'tomo-flipwick',
  'juno-skylark',
  'brick-boulderback',
  'mira-nimbus',
] as const;

export type CharacterId = (typeof characterIds)[number];

export const gameModes = [
  'classic',
  'challenge',
  'timeattack',
  'practice',
] as const;

export type GameMode = (typeof gameModes)[number];

export type KeyAction = 'left' | 'right' | 'jump' | 'pause' | 'run';

export type KeybindingMap = Record<KeyAction, string>;

export type ChallengeDefinition = {
  id: string;
  name: string;
  description: string;
  targetFloor?: number;
  targetScore?: number;
  targetCombo?: number;
  timeLimitSeconds?: number;
};

export type GameSettings = {
  soundEnabled: boolean;
  screenShakeEnabled: boolean;
  comboTextEnabled: boolean;
  tutorialHintsEnabled: boolean;
  showGhostRuns: boolean;
  gamepadEnabled: boolean;
  gamepadDeadzone: number;
  keybindings: KeybindingMap;
};

export type ReplayFrame = {
  t: number;
  left: boolean;
  right: boolean;
  jump: boolean;
  run: boolean;
};

export type ReplayRecording = {
  version: 1;
  mode: GameMode;
  character: CharacterId;
  challengeId?: string;
  createdAt: number;
  durationSeconds: number;
  score: number;
  floor: number;
  combo: number;
  events: ReplayFrame[];
};

export type CharacterMeta = {
  id: CharacterId;
  name: string;
  blurb: string;
  accent: string;
  unlockFloor?: number;
};

export const characters: CharacterMeta[] = [
  {
    id: 'rex-rafter',
    name: 'Rex Rafter',
    blurb: 'Momentum stunt climber',
    accent: '#fd6f2d',
  },
  {
    id: 'vexa-voltstride',
    name: 'Vexa Voltstride',
    blurb: 'Magnetic-boot courier',
    accent: '#40b8ff',
    unlockFloor: 30,
  },
  {
    id: 'tomo-flipwick',
    name: 'Tomo Flipwick',
    blurb: 'Circus acrobat',
    accent: '#efc84e',
    unlockFloor: 60,
  },
  {
    id: 'juno-skylark',
    name: 'Juno Skylark',
    blurb: 'Sky-pirate gauntlet specialist',
    accent: '#a98cff',
    unlockFloor: 100,
  },
  {
    id: 'brick-boulderback',
    name: 'Brick Boulderback',
    blurb: 'Heavy momentum slammer',
    accent: '#6fba61',
    unlockFloor: 140,
  },
  {
    id: 'mira-nimbus',
    name: 'Mira Nimbus',
    blurb: 'Cloud mage with air-burst hops',
    accent: '#ff84bd',
    unlockFloor: 180,
  },
];

export type PlayerProfile = {
  selectedCharacter: CharacterId;
  bestFloor: number;
  bestCombo: number;
  bestScore: number;
  totalFloors: number;
  totalCombos: number;
  totalScore: number;
  playtimeSeconds: number;
  runsPlayed: number;
  unlockedAchievements: string[];
  settings: GameSettings;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  floor: number;
  combo: number;
  character: CharacterId;
  mode: GameMode;
  challengeId?: string;
  modeCompleted?: boolean;
  createdAt: number;
};

export type RunSubmission = {
  mode: GameMode;
  score: number;
  floor: number;
  combo: number;
  character: CharacterId;
  playtimeSeconds: number;
  challengeId?: string;
  modeCompleted?: boolean;
};

export type RunSummary = {
  score: number;
  floor: number;
  combo: number;
  playtimeSeconds: number;
  mode: GameMode;
  challengeId?: string;
  modeCompleted?: boolean;
  replay?: ReplayRecording;
  isReplay?: boolean;
};

export type LiveGameState = {
  score: number;
  floor: number;
  combo: number;
  comboTimer: number;
  comboText: string | null;
  risingProgress: number;
  elapsedSeconds: number;
  modeCompleted: boolean;
};
