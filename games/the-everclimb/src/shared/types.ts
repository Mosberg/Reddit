export const characterIds = [
  'rex-rafter',
  'vexa-voltstride',
  'tomo-flipwick',
  'juno-skylark',
  'brick-boulderback',
  'mira-nimbus',
] as const;

export type CharacterId = (typeof characterIds)[number];

export const gameModes = ['classic', 'challenge', 'timeattack', 'practice'] as const;

export type GameMode = (typeof gameModes)[number];

export type CharacterMeta = {
  id: CharacterId;
  name: string;
  blurb: string;
  accent: string;
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
  },
  {
    id: 'tomo-flipwick',
    name: 'Tomo Flipwick',
    blurb: 'Circus acrobat',
    accent: '#efc84e',
  },
  {
    id: 'juno-skylark',
    name: 'Juno Skylark',
    blurb: 'Sky-pirate gauntlet specialist',
    accent: '#a98cff',
  },
  {
    id: 'brick-boulderback',
    name: 'Brick Boulderback',
    blurb: 'Heavy momentum slammer',
    accent: '#6fba61',
  },
  {
    id: 'mira-nimbus',
    name: 'Mira Nimbus',
    blurb: 'Cloud mage with air-burst hops',
    accent: '#ff84bd',
  },
];

export type PlayerProfile = {
  selectedCharacter: CharacterId;
  bestFloor: number;
  bestCombo: number;
  totalFloors: number;
  totalCombos: number;
  playtimeSeconds: number;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  score: number;
  floor: number;
  combo: number;
  character: CharacterId;
  mode: GameMode;
  createdAt: number;
};

export type RunSubmission = {
  mode: GameMode;
  score: number;
  floor: number;
  combo: number;
  character: CharacterId;
  playtimeSeconds: number;
};

export type LiveGameState = {
  score: number;
  floor: number;
  combo: number;
  comboTimer: number;
  risingProgress: number;
  elapsedSeconds: number;
};
