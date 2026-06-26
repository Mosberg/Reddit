import { useEffect, useMemo, useRef } from 'react';
import {
  applyGravity,
  clamp,
  computeHorizontalVelocity,
  computeJumpVelocity,
  platformColor,
  type Platform,
  type PlatformKind,
  worldConfig,
} from '../shared/physics';
import {
  computeCombo,
  risingSpeedForMode,
  scoreForLanding,
  type ComboState,
} from '../shared/mechanics';
import type { CharacterId, GameMode, LiveGameState } from '../shared/types';

type RunResult = {
  score: number;
  floor: number;
  combo: number;
  playtimeSeconds: number;
};

type GameCanvasProps = {
  mode: GameMode;
  character: CharacterId;
  isPaused: boolean;
  resetToken: number;
  onState: (state: LiveGameState) => void;
  onRunEnd: (result: RunResult) => void;
};

type RuntimeState = {
  player: {
    x: number;
    y: number;
    width: number;
    height: number;
    vx: number;
    vy: number;
  };
  grounded: boolean;
  coyoteTimer: number;
  jumpedThisPress: boolean;
  platforms: Platform[];
  nextPlatformId: number;
  nextPlatformY: number;
  cameraY: number;
  risingY: number;
  risingSpeed: number;
  score: number;
  floor: number;
  bestFloorThisRun: number;
  combo: ComboState;
  playtimeSeconds: number;
  elapsedSeconds: number;
  challengeTargetFloor: number;
  challengeTargetScore: number;
  gameOver: boolean;
};

const FLOOR_UNIT = 120;

const seededRand = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const createInitialPlatforms = (): { platforms: Platform[]; nextY: number } => {
  const platforms: Platform[] = [];
  const rand = seededRand(42);
  let y = 570;
  for (let i = 0; i < 24; i += 1) {
    const kind: PlatformKind = i % 7 === 0 ? 'ice' : i % 5 === 0 ? 'wood' : 'stone';
    const width = clamp(130 - i * 1.8, 68, 130);
    const x = clamp(rand() * (worldConfig.arenaWidth - width), 20, worldConfig.arenaWidth - width - 20);
    platforms.push({ id: i + 1, x, y, width, kind });
    y -= 64 + rand() * 36;
  }
  return { platforms, nextY: y };
};

const createRuntimeState = (mode: GameMode): RuntimeState => {
  const initial = createInitialPlatforms();
  const risingStart = worldConfig.viewportHeight + 80;
  return {
    player: {
      x: worldConfig.arenaWidth / 2 - 12,
      y: 520,
      width: 24,
      height: 32,
      vx: 0,
      vy: 0,
    },
    grounded: false,
    coyoteTimer: 0,
    jumpedThisPress: false,
    platforms: initial.platforms,
    nextPlatformId: initial.platforms.length + 1,
    nextPlatformY: initial.nextY,
    cameraY: 0,
    risingY: risingStart,
    risingSpeed: risingSpeedForMode(mode),
    score: 0,
    floor: 0,
    bestFloorThisRun: 0,
    combo: { chain: 0, timer: 0, maxChain: 0 },
    playtimeSeconds: 0,
    elapsedSeconds: 0,
    challengeTargetFloor: 45,
    challengeTargetScore: 10000,
    gameOver: false,
  };
};

export const GameCanvas = ({
  mode,
  character,
  isPaused,
  resetToken,
  onState,
  onRunEnd,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RuntimeState>(createRuntimeState(mode));
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false, jump: false });

  useEffect(() => {
    stateRef.current = createRuntimeState(mode);
    onState({
      score: 0,
      floor: 0,
      combo: 0,
      comboTimer: 0,
      risingProgress: 0,
      elapsedSeconds: 0,
    });
  }, [mode, resetToken, onState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keysRef.current.left = true;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keysRef.current.right = true;
      }
      if (event.key === 'ArrowUp' || event.key === ' ' || event.key.toLowerCase() === 'w') {
        keysRef.current.jump = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        keysRef.current.left = false;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        keysRef.current.right = false;
      }
      if (event.key === 'ArrowUp' || event.key === ' ' || event.key.toLowerCase() === 'w') {
        keysRef.current.jump = false;
        stateRef.current.jumpedThisPress = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const accent = useMemo(() => {
    const map: Record<CharacterId, string> = {
      'rex-rafter': '#fd6f2d',
      'vexa-voltstride': '#3fbfff',
      'tomo-flipwick': '#efc84e',
      'juno-skylark': '#ad96ff',
      'brick-boulderback': '#72be5e',
      'mira-nimbus': '#ff85bd',
    };
    return map[character];
  }, [character]);

  useEffect(() => {
    const tick = (time: number): void => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }

      const rawDt = (time - (lastTimeRef.current ?? time)) / 1000;
      const dt = Math.min(rawDt, 0.033);
      lastTimeRef.current = time;

      const state = stateRef.current;

      if (!isPaused && !state.gameOver) {
        state.playtimeSeconds += dt;
        state.elapsedSeconds += dt;

        const inputAxis = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
        const surfaceFriction = 1;

        state.player.vx = computeHorizontalVelocity(
          state.player.vx,
          inputAxis,
          state.grounded,
          surfaceFriction,
          dt
        );

        if (keysRef.current.jump && !state.jumpedThisPress && (state.grounded || state.coyoteTimer > 0)) {
          state.player.vy = computeJumpVelocity(state.player.vx);
          state.grounded = false;
          state.coyoteTimer = 0;
          state.jumpedThisPress = true;
        }

        if (!state.grounded) {
          state.player.vy = applyGravity(state.player.vy, dt);
        }

        const previousBottom = state.player.y + state.player.height;
        const nextX = clamp(
          state.player.x + state.player.vx * dt,
          0,
          worldConfig.arenaWidth - state.player.width
        );
        const nextY = state.player.y + state.player.vy * dt;
        const nextBottom = nextY + state.player.height;

        state.player.x = nextX;
        state.player.y = nextY;
        state.grounded = false;

        if (state.player.vy >= 0) {
          for (const platform of state.platforms) {
            const horizontalOverlap =
              state.player.x + state.player.width > platform.x &&
              state.player.x < platform.x + platform.width;
            const crossed =
              previousBottom <= platform.y + worldConfig.edgeTolerance &&
              nextBottom >= platform.y;

            if (horizontalOverlap && crossed) {
              state.player.y = platform.y - state.player.height;
              state.player.vy = 0;
              state.grounded = true;

              const floorAtLanding = Math.max(0, Math.floor((560 - state.player.y) / FLOOR_UNIT));
              const gain = Math.max(0, floorAtLanding - state.bestFloorThisRun);
              state.combo = computeCombo(state.combo, gain, dt);
              state.score += scoreForLanding(gain, state.combo.chain);
              state.floor = floorAtLanding;
              state.bestFloorThisRun = Math.max(state.bestFloorThisRun, floorAtLanding);
              break;
            }
          }
        }

        state.combo = computeCombo(state.combo, 0, dt);

        if (!state.grounded) {
          state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
        } else {
          state.coyoteTimer = worldConfig.coyoteWindow;
        }

        const cameraTarget = state.player.y - worldConfig.viewportHeight * 0.56;
        state.cameraY = Math.min(state.cameraY, cameraTarget);

        if (mode !== 'practice') {
          state.risingY -= state.risingSpeed * dt;
          if (mode === 'classic') {
            state.risingSpeed += 1.4 * dt;
          }
          if (mode === 'timeattack') {
            state.risingSpeed += 2.0 * dt;
          }
          if (mode === 'challenge') {
            state.risingSpeed += 1.0 * dt;
          }
        }

        while (state.nextPlatformY > state.cameraY - 1200) {
          const rand = seededRand(state.nextPlatformId * 97);
          const width = clamp(120 - Math.min(state.bestFloorThisRun, 60), 52, 120) + rand() * 12;
          const spacing = 65 + rand() * 64 + Math.min(state.bestFloorThisRun, 90) * 0.45;
          const x = clamp(rand() * (worldConfig.arenaWidth - width), 14, worldConfig.arenaWidth - width - 14);
          const roll = rand();
          const kind: PlatformKind = roll > 0.78 ? 'ice' : roll > 0.56 ? 'wood' : 'stone';
          state.platforms.push({
            id: state.nextPlatformId,
            x,
            y: state.nextPlatformY,
            width,
            kind,
          });
          state.nextPlatformId += 1;
          state.nextPlatformY -= spacing;
        }

        state.platforms = state.platforms.filter(
          (platform) => platform.y < state.cameraY + worldConfig.viewportHeight + 220
        );

        const playerBottom = state.player.y + state.player.height;
        if (playerBottom > state.risingY || playerBottom > state.cameraY + worldConfig.viewportHeight + 160) {
          state.gameOver = true;
          onRunEnd({
            score: state.score,
            floor: state.bestFloorThisRun,
            combo: state.combo.maxChain,
            playtimeSeconds: state.playtimeSeconds,
          });
        }

        if (mode === 'timeattack' && state.elapsedSeconds >= 90) {
          state.gameOver = true;
          onRunEnd({
            score: state.score,
            floor: state.bestFloorThisRun,
            combo: state.combo.maxChain,
            playtimeSeconds: state.playtimeSeconds,
          });
        }

        if (mode === 'challenge' && state.bestFloorThisRun >= state.challengeTargetFloor) {
          state.score += state.challengeTargetScore;
          state.gameOver = true;
          onRunEnd({
            score: state.score,
            floor: state.bestFloorThisRun,
            combo: state.combo.maxChain,
            playtimeSeconds: state.playtimeSeconds,
          });
        }
      }

      const cw = canvas.width;
      const ch = canvas.height;

      const gradient = ctx.createLinearGradient(0, 0, 0, ch);
      gradient.addColorStop(0, '#84d6ff');
      gradient.addColorStop(0.5, '#d8f6ff');
      gradient.addColorStop(1, '#fff4e3');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cw, ch);

      const stateNow = stateRef.current;

      for (const platform of stateNow.platforms) {
        const sy = platform.y - stateNow.cameraY;
        if (sy < -20 || sy > ch + 30) continue;
        ctx.fillStyle = platformColor(platform.kind);
        ctx.fillRect(platform.x, sy, platform.width, 12);
      }

      const risingScreenY = stateNow.risingY - stateNow.cameraY;
      if (risingScreenY < ch + 120) {
        const riseGradient = ctx.createLinearGradient(0, risingScreenY, 0, ch);
        riseGradient.addColorStop(0, 'rgba(240, 32, 94, 0.45)');
        riseGradient.addColorStop(1, 'rgba(50, 0, 20, 0.8)');
        ctx.fillStyle = riseGradient;
        ctx.fillRect(0, risingScreenY, cw, ch - risingScreenY + 140);
      }

      const py = stateNow.player.y - stateNow.cameraY;
      ctx.fillStyle = accent;
      ctx.fillRect(stateNow.player.x, py, stateNow.player.width, stateNow.player.height);

      if (stateNow.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 30px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Run Over', cw / 2, ch / 2 - 10);
        ctx.font = '500 16px "Trebuchet MS", sans-serif';
        ctx.fillText('Press Restart to climb again', cw / 2, ch / 2 + 22);
      }

      const risingProgress = clamp(
        (worldConfig.viewportHeight + 80 - stateNow.risingY) / (worldConfig.viewportHeight + 80),
        0,
        1
      );

      onState({
        score: stateNow.score,
        floor: stateNow.bestFloorThisRun,
        combo: stateNow.combo.chain,
        comboTimer: stateNow.combo.timer,
        risingProgress,
        elapsedSeconds: stateNow.elapsedSeconds,
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = null;
      lastTimeRef.current = null;
    };
  }, [accent, isPaused, mode, onRunEnd, onState]);

  return (
    <canvas
      ref={canvasRef}
      width={worldConfig.arenaWidth}
      height={worldConfig.viewportHeight}
      className="w-full max-w-[420px] rounded-2xl border border-black/10 bg-sky-50 shadow-xl"
    />
  );
};
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyGravity,
  clamp,
  computeHorizontalVelocity,
  computeJumpVelocity,
  platformColor,
  type Platform,
  type PlatformKind,
  type PlayerBody,
  worldConfig,
} from '../shared/physics';
import { computeCombo, risingSpeedForMode, scoreForLanding, type ComboState } from '../shared/mechanics';
import type { CharacterId, GameMode, LiveGameState } from '../shared/types';

const FLOOR_HEIGHT = 80;
const CANVAS_WIDTH = worldConfig.arenaWidth;
const CANVAS_HEIGHT = worldConfig.viewportHeight;

const characterColorMap: Record<CharacterId, string> = {
  'rex-rafter': '#fd6f2d',
  'vexa-voltstride': '#40b8ff',
  'tomo-flipwick': '#efc84e',
  'juno-skylark': '#a98cff',
  'brick-boulderback': '#6fba61',
  'mira-nimbus': '#ff84bd',
};

type GameCanvasProps = {
  mode: GameMode;
  character: CharacterId;
  onStateChange: (state: LiveGameState) => void;
  onGameOver: (result: { score: number; floor: number; combo: number; playtimeSeconds: number }) => void;
  resetCounter: number;
};

type RuntimeState = {
  player: PlayerBody;
  platforms: Platform[];
  nextPlatformId: number;
  platformCursorY: number;
  floor: number;
  lastLandingFloor: number;
  score: number;
  combo: ComboState;
  coyoteSeconds: number;
  grounded: boolean;
  risingY: number;
  gameOver: boolean;
  elapsedSeconds: number;
  timeAttackLeft: number;
};

type InputState = {
  left: boolean;
  right: boolean;
  jumpQueued: boolean;
};

const createInitialPlatforms = (): { platforms: Platform[]; nextId: number; cursorY: number } => {
  const platforms: Platform[] = [];
  let id = 1;

  const baseY = 580;
  platforms.push({
    id,
    x: 100,
    y: baseY,
    width: 220,
    kind: 'stone',
  });

  let cursorY = baseY - 80;
  while (cursorY > -1200) {
    id += 1;
    const floor = Math.max(0, Math.floor((baseY - cursorY) / FLOOR_HEIGHT));
    const width = clamp(180 - floor * 2.2, 80, 180);
    const gapX = Math.random() * (CANVAS_WIDTH - width - 24) + 12;
    const kind: PlatformKind = floor % 9 === 0 ? 'ice' : floor % 5 === 0 ? 'wood' : 'stone';
    platforms.push({
      id,
      x: gapX,
      y: cursorY,
      width,
      kind,
    });
    cursorY -= clamp(68 + floor * 0.4, 68, 138);
  }

  return { platforms, nextId: id + 1, cursorY };
};

const seedRuntime = (mode: GameMode): RuntimeState => {
  const generated = createInitialPlatforms();

  return {
    player: {
      x: 200,
      y: 528,
      width: 26,
      height: 38,
      vx: 0,
      vy: 0,
    },
    platforms: generated.platforms,
    nextPlatformId: generated.nextId,
    platformCursorY: generated.cursorY,
    floor: 0,
    lastLandingFloor: 0,
    score: 0,
    combo: {
      chain: 0,
      timer: 0,
      maxChain: 0,
    },
    coyoteSeconds: 0,
    grounded: true,
    risingY: 710,
    gameOver: false,
    elapsedSeconds: 0,
    timeAttackLeft: mode === 'timeattack' ? 60 : Number.POSITIVE_INFINITY,
  };
};

const generatePlatform = (state: RuntimeState): void => {
  const floor = Math.max(0, Math.floor((580 - state.platformCursorY) / FLOOR_HEIGHT));
  const width = clamp(176 - floor * 2.4, 76, 176);
  const x = Math.random() * (CANVAS_WIDTH - width - 20) + 10;
  const roll = Math.random();
  const kind: PlatformKind = roll < 0.15 ? 'ice' : roll < 0.35 ? 'wood' : 'stone';

  state.platforms.push({
    id: state.nextPlatformId,
    x,
    y: state.platformCursorY,
    width,
    kind,
  });
  state.nextPlatformId += 1;

  const spacing = clamp(72 + floor * 0.45, 72, 142);
  state.platformCursorY -= spacing;
};

const floorForY = (y: number): number => {
  return Math.max(0, Math.floor((528 - y) / FLOOR_HEIGHT));
};

export const GameCanvas = ({ mode, character, onStateChange, onGameOver, resetCounter }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<RuntimeState>(seedRuntime(mode));
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jumpQueued: false });
  const [touchAxis, setTouchAxis] = useState<number>(0);

  const risingSpeed = useMemo(() => risingSpeedForMode(mode), [mode]);

  useEffect(() => {
    runtimeRef.current = seedRuntime(mode);
    lastTickRef.current = null;
  }, [mode, resetCounter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        inputRef.current.left = true;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        inputRef.current.right = true;
      }
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        inputRef.current.jumpQueued = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        inputRef.current.left = false;
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        inputRef.current.right = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const renderFrame = (timestamp: number): void => {
      const state = runtimeRef.current;
      if (state.gameOver) {
        return;
      }

      const lastTick = lastTickRef.current ?? timestamp;
      const dt = Math.min((timestamp - lastTick) / 1000, 0.032);
      lastTickRef.current = timestamp;

      const inputAxis = touchAxis !== 0 ? touchAxis : (inputRef.current.left ? -1 : 0) + (inputRef.current.right ? 1 : 0);
      const player = state.player;

      state.elapsedSeconds += dt;
      state.combo = computeCombo(state.combo, 0, dt);

      if (mode === 'timeattack') {
        state.timeAttackLeft = Math.max(0, state.timeAttackLeft - dt);
        if (state.timeAttackLeft === 0) {
          state.gameOver = true;
        }
      }

      if (state.grounded) {
        state.coyoteSeconds = worldConfig.coyoteWindow;
      } else {
        state.coyoteSeconds = Math.max(0, state.coyoteSeconds - dt);
      }

      if (inputRef.current.jumpQueued && (state.grounded || state.coyoteSeconds > 0)) {
        player.vy = computeJumpVelocity(player.vx);
        state.grounded = false;
        state.coyoteSeconds = 0;
      }
      inputRef.current.jumpQueued = false;

      const surface = state.grounded
        ? state.platforms.find((platform) => {
            const feetY = player.y + player.height;
            return Math.abs(feetY - platform.y) < 2 && player.x + player.width > platform.x && player.x < platform.x + platform.width;
          })
        : null;

      player.vx = computeHorizontalVelocity(player.vx, inputAxis, state.grounded, surface ? 1 : 1, dt);
      player.vy = applyGravity(player.vy, dt);

      const prevBottom = player.y + player.height;
      player.x = clamp(player.x + player.vx * dt, 0, CANVAS_WIDTH - player.width);
      player.y += player.vy * dt;

      state.grounded = false;
      if (player.vy >= 0) {
        for (const platform of state.platforms) {
          const platformTop = platform.y;
          const nowBottom = player.y + player.height;
          const crossed = prevBottom <= platformTop + worldConfig.edgeTolerance && nowBottom >= platformTop - worldConfig.edgeTolerance;
          const inside = player.x + player.width - 4 > platform.x && player.x + 4 < platform.x + platform.width;
          if (crossed && inside) {
            player.y = platformTop - player.height;
            player.vy = 0;
            state.grounded = true;

            const landedFloor = floorForY(player.y);
            const gained = Math.max(0, landedFloor - state.lastLandingFloor);
            state.combo = computeCombo(state.combo, gained, 0);
            if (gained > 0) {
              state.score += scoreForLanding(gained, state.combo.chain);
            }
            state.floor = Math.max(state.floor, landedFloor);
            state.lastLandingFloor = landedFloor;
            break;
          }
        }
      }

      while (state.platformCursorY > player.y - 1400) {
        generatePlatform(state);
      }
      state.platforms = state.platforms.filter((platform) => platform.y < player.y + 900);

      state.risingY -= risingSpeed * dt;
      if (player.y + player.height >= state.risingY) {
        state.gameOver = true;
      }

      const risingProgress = clamp((player.y + player.height - (state.risingY - 320)) / 320, 0, 1);
      onStateChange({
        score: state.score,
        floor: state.floor,
        combo: state.combo.chain,
        comboTimer: state.combo.timer,
        risingProgress,
      });

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const cameraY = player.y - CANVAS_HEIGHT * 0.55;

        const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#9de0ff');
        gradient.addColorStop(0.5, '#d5f3ff');
        gradient.addColorStop(1, '#fff9e9');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = 'rgba(40, 74, 110, 0.12)';
        ctx.lineWidth = 1;
        for (let y = -40; y < CANVAS_HEIGHT + 40; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y + ((cameraY * 0.1) % 40));
          ctx.lineTo(CANVAS_WIDTH, y + ((cameraY * 0.1) % 40));
          ctx.stroke();
        }

        for (const platform of state.platforms) {
          const sy = platform.y - cameraY;
          if (sy > CANVAS_HEIGHT + 40 || sy < -30) continue;
          ctx.fillStyle = platformColor(platform.kind);
          ctx.fillRect(platform.x, sy, platform.width, 10);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(platform.x, sy + 10, platform.width, 2);
        }

        const risingScreenY = state.risingY - cameraY;
        ctx.fillStyle = 'rgba(201, 33, 56, 0.75)';
        ctx.fillRect(0, risingScreenY, CANVAS_WIDTH, CANVAS_HEIGHT - risingScreenY + 20);

        const playerScreenY = player.y - cameraY;
        ctx.fillStyle = characterColorMap[character];
        ctx.fillRect(player.x, playerScreenY, player.width, player.height);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(player.x + 5, playerScreenY + 7, 5, 5);
      }

      if (state.gameOver) {
        onGameOver({
          score: state.score,
          floor: state.floor,
          combo: state.combo.maxChain,
          playtimeSeconds: state.elapsedSeconds,
        });
        return;
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [character, mode, onGameOver, onStateChange, risingSpeed, touchAxis]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full rounded-2xl border border-slate-300 bg-slate-100 shadow-xl"
      />
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <button
          type="button"
          onTouchStart={() => setTouchAxis(-1)}
          onTouchEnd={() => setTouchAxis(0)}
          onMouseDown={() => setTouchAxis(-1)}
          onMouseUp={() => setTouchAxis(0)}
          className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
        >
          Left
        </button>
        <button
          type="button"
          onTouchStart={() => {
            inputRef.current.jumpQueued = true;
          }}
          onMouseDown={() => {
            inputRef.current.jumpQueued = true;
          }}
          className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Jump
        </button>
        <button
          type="button"
          onTouchStart={() => setTouchAxis(1)}
          onTouchEnd={() => setTouchAxis(0)}
          onMouseDown={() => setTouchAxis(1)}
          onMouseUp={() => setTouchAxis(0)}
          className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
        >
          Right
        </button>
      </div>
    </div>
  );
};
