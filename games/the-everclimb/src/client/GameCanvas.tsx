import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  applyGravity,
  clamp,
  computeHorizontalVelocity,
  computeJumpVelocity,
  platformFriction,
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
import type {
  ChallengeDefinition,
  CharacterId,
  GameMode,
  GameSettings,
  LiveGameState,
  ReplayRecording,
} from '../shared/types';

type RunResult = {
  score: number;
  floor: number;
  combo: number;
  playtimeSeconds: number;
  replay?: ReplayRecording;
  isReplay?: boolean;
};

type GameCanvasProps = {
  mode: GameMode;
  character: CharacterId;
  challenge: ChallengeDefinition | null;
  settings: GameSettings;
  replay: ReplayRecording | null;
  isPaused: boolean;
  resetToken: number;
  onState: (state: LiveGameState) => void;
  onPauseToggle: () => void;
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
  jumpBufferTimer: number;
  runMomentum: number;
  playtimeSeconds: number;
  elapsedSeconds: number;
  challengeTargetFloor: number;
  challengeTargetScore: number;
  challengeCompleted: boolean;
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
    const kind: PlatformKind =
      i % 7 === 0 ? 'ice' : i % 5 === 0 ? 'wood' : 'stone';
    const width = clamp(130 - i * 1.8, 68, 130);
    const x = clamp(
      rand() * (worldConfig.arenaWidth - width),
      20,
      worldConfig.arenaWidth - width - 20
    );
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
    jumpBufferTimer: 0,
    runMomentum: 0,
    playtimeSeconds: 0,
    elapsedSeconds: 0,
    challengeTargetFloor: 45,
    challengeTargetScore: 10000,
    challengeCompleted: false,
    gameOver: false,
  };
};

export const GameCanvas = ({
  mode,
  character,
  challenge,
  settings,
  replay,
  isPaused,
  resetToken,
  onState,
  onPauseToggle,
  onRunEnd,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RuntimeState>(createRuntimeState(mode));
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const keysRef = useRef({
    left: false,
    right: false,
    jump: false,
    run: false,
  });
  const gamepadInputRef = useRef({
    left: false,
    right: false,
    jump: false,
    run: false,
  });
  const gamepadPrevJumpRef = useRef(false);
  const gamepadPrevPauseRef = useRef(false);
  const replayCursorRef = useRef(0);
  const recordingRef = useRef<
    Array<{
      t: number;
      left: boolean;
      right: boolean;
      jump: boolean;
      run: boolean;
    }>
  >([]);
  const audioRef = useRef<AudioContext | null>(null);

  const touchDevice = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const playTone = useCallback(
    (frequency: number, durationMs: number): void => {
      if (!settings.soundEnabled || typeof window === 'undefined') {
        return;
      }
      try {
        audioRef.current ??= new AudioContext();
        const ctx = audioRef.current;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.03;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + durationMs / 1000);
      } catch {
        // Audio may be blocked until user gesture; ignore failure.
      }
    },
    [settings.soundEnabled]
  );

  useEffect(() => {
    stateRef.current = createRuntimeState(mode);
    replayCursorRef.current = 0;
    recordingRef.current = [];
    onState({
      score: 0,
      floor: 0,
      combo: 0,
      comboTimer: 0,
      comboText: null,
      risingProgress: 0,
      elapsedSeconds: 0,
      modeCompleted: false,
    });
  }, [mode, resetToken, onState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const pausePressed =
        event.code === settings.keybindings.pause || event.code === 'Escape';
      if (pausePressed) {
        event.preventDefault();
        onPauseToggle();
        return;
      }

      if (
        event.code === settings.keybindings.left ||
        event.code === 'ArrowLeft' ||
        event.code === 'KeyA'
      ) {
        event.preventDefault();
        keysRef.current.left = true;
      }
      if (
        event.code === settings.keybindings.right ||
        event.code === 'ArrowRight' ||
        event.code === 'KeyD'
      ) {
        event.preventDefault();
        keysRef.current.right = true;
      }
      if (
        event.code === settings.keybindings.jump ||
        event.code === 'ArrowUp' ||
        event.code === 'Space' ||
        event.code === 'KeyW'
      ) {
        event.preventDefault();
        if (!keysRef.current.jump) {
          stateRef.current.jumpBufferTimer = worldConfig.coyoteWindow;
        }
        keysRef.current.jump = true;
      }

      if (
        event.code === settings.keybindings.run ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight'
      ) {
        keysRef.current.run = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (
        event.code === settings.keybindings.left ||
        event.code === 'ArrowLeft' ||
        event.code === 'KeyA'
      ) {
        event.preventDefault();
        keysRef.current.left = false;
      }
      if (
        event.code === settings.keybindings.right ||
        event.code === 'ArrowRight' ||
        event.code === 'KeyD'
      ) {
        event.preventDefault();
        keysRef.current.right = false;
      }
      if (
        event.code === settings.keybindings.jump ||
        event.code === 'ArrowUp' ||
        event.code === 'Space' ||
        event.code === 'KeyW'
      ) {
        event.preventDefault();
        keysRef.current.jump = false;
        stateRef.current.jumpedThisPress = false;
      }

      if (
        event.code === settings.keybindings.run ||
        event.code === 'ShiftLeft' ||
        event.code === 'ShiftRight'
      ) {
        keysRef.current.run = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    onPauseToggle,
    settings.keybindings.pause,
    settings.keybindings.run,
    settings.keybindings.jump,
    settings.keybindings.left,
    settings.keybindings.right,
  ]);

  useEffect(() => {
    if (!settings.gamepadEnabled) {
      gamepadInputRef.current = {
        left: false,
        right: false,
        jump: false,
        run: false,
      };
      return;
    }

    let rafId: number | null = null;
    const poll = (): void => {
      const pads = navigator.getGamepads?.() ?? [];
      const pad = pads[0];
      if (pad) {
        const axisX = pad.axes[0] ?? 0;
        const deadzone = settings.gamepadDeadzone;
        gamepadInputRef.current.left =
          axisX < -deadzone || !!pad.buttons[14]?.pressed;
        gamepadInputRef.current.right =
          axisX > deadzone || !!pad.buttons[15]?.pressed;
        gamepadInputRef.current.jump =
          !!pad.buttons[0]?.pressed ||
          !!pad.buttons[1]?.pressed ||
          !!pad.buttons[12]?.pressed;
        gamepadInputRef.current.run =
          !!pad.buttons[4]?.pressed ||
          !!pad.buttons[5]?.pressed ||
          !!pad.buttons[6]?.pressed ||
          !!pad.buttons[7]?.pressed;

        if (gamepadInputRef.current.jump && !gamepadPrevJumpRef.current) {
          stateRef.current.jumpBufferTimer = worldConfig.coyoteWindow;
        }
        gamepadPrevJumpRef.current = gamepadInputRef.current.jump;

        const pausePressed = !!pad.buttons[9]?.pressed;
        if (pausePressed && !gamepadPrevPauseRef.current) {
          onPauseToggle();
        }
        gamepadPrevPauseRef.current = pausePressed;
      } else {
        gamepadInputRef.current = {
          left: false,
          right: false,
          jump: false,
          run: false,
        };
        gamepadPrevJumpRef.current = false;
        gamepadPrevPauseRef.current = false;
      }
      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [onPauseToggle, settings.gamepadDeadzone, settings.gamepadEnabled]);

  const colorMap = useMemo(() => {
    const map: Record<
      CharacterId,
      { body: string; belt: string; band: string }
    > = {
      'rex-rafter': { body: '#fd6f2d', belt: '#ffd5bf', band: '#bf3f08' },
      'vexa-voltstride': { body: '#3fbfff', belt: '#d9f4ff', band: '#0b5e85' },
      'tomo-flipwick': { body: '#efc84e', belt: '#fff2b3', band: '#8a6511' },
      'juno-skylark': { body: '#ad96ff', belt: '#ece7ff', band: '#5a3ac7' },
      'brick-boulderback': {
        body: '#72be5e',
        belt: '#dff5d4',
        band: '#2d7427',
      },
      'mira-nimbus': { body: '#ff85bd', belt: '#ffdff0', band: '#a42a68' },
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
        state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);

        const replayFrame = replay?.events[replayCursorRef.current] ?? null;
        const replayActive = !!replayFrame;

        if (replayActive && replay) {
          while (replayCursorRef.current < replay.events.length - 1) {
            const nextEvent = replay.events[replayCursorRef.current + 1];
            if (!nextEvent || nextEvent.t > state.elapsedSeconds) {
              break;
            }
            replayCursorRef.current += 1;
          }
        }

        const liveLeft = keysRef.current.left || gamepadInputRef.current.left;
        const liveRight =
          keysRef.current.right || gamepadInputRef.current.right;
        const liveJump = keysRef.current.jump || gamepadInputRef.current.jump;
        const liveRun = keysRef.current.run || gamepadInputRef.current.run;

        const left = replayActive ? replayFrame.left : liveLeft;
        const right = replayActive ? replayFrame.right : liveRight;
        const jump = replayActive ? replayFrame.jump : liveJump;
        const run = replayActive ? replayFrame.run : liveRun;

        if (!replayActive) {
          recordingRef.current.push({
            t: Number(state.elapsedSeconds.toFixed(3)),
            left,
            right,
            jump,
            run,
          });
        }

        const inputAxis = (right ? 1 : 0) - (left ? 1 : 0);

        if (run && inputAxis !== 0) {
          const gainRate = state.grounded ? 1.45 : 0.8;
          state.runMomentum = Math.min(1, state.runMomentum + gainRate * dt);
        } else {
          const decayRate = state.grounded ? 0.75 : 0.45;
          state.runMomentum = Math.max(0, state.runMomentum - decayRate * dt);
        }

        const runAxis = inputAxis * (1 + state.runMomentum * 0.6);
        const currentPlatform = state.platforms.find((platform) => {
          const feetY = state.player.y + state.player.height;
          return (
            Math.abs(feetY - platform.y) <= 2 &&
            state.player.x + state.player.width > platform.x &&
            state.player.x < platform.x + platform.width
          );
        });
        const surfaceFriction = currentPlatform
          ? platformFriction[currentPlatform.kind]
          : 1;

        state.player.vx = computeHorizontalVelocity(
          state.player.vx,
          runAxis,
          state.grounded,
          surfaceFriction,
          dt
        );

        const maxSprintSpeed =
          worldConfig.moveSpeed * (1 + state.runMomentum * 0.72);
        state.player.vx = clamp(
          state.player.vx,
          -maxSprintSpeed,
          maxSprintSpeed
        );

        if (
          (jump || state.jumpBufferTimer > 0) &&
          !state.jumpedThisPress &&
          (state.grounded || state.coyoteTimer > 0)
        ) {
          const highSpeed =
            Math.abs(state.player.vx) >= worldConfig.moveSpeed * 1.15;
          const momentumJumpBoost = highSpeed
            ? 70 + state.runMomentum * 120
            : 0;
          state.player.vy =
            computeJumpVelocity(state.player.vx) - momentumJumpBoost;
          if (highSpeed) {
            state.player.vx *= 1.04 + state.runMomentum * 0.08;
          }
          state.grounded = false;
          state.coyoteTimer = 0;
          state.jumpedThisPress = true;
          state.jumpBufferTimer = 0;
          playTone(420, 45);
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

              const floorAtLanding = Math.max(
                0,
                Math.floor((560 - state.player.y) / FLOOR_UNIT)
              );
              const gain = Math.max(0, floorAtLanding - state.bestFloorThisRun);
              state.combo = computeCombo(state.combo, gain, dt);
              state.score += scoreForLanding(gain, state.combo.chain);
              state.floor = floorAtLanding;
              state.bestFloorThisRun = Math.max(
                state.bestFloorThisRun,
                floorAtLanding
              );
              if (gain >= 2 || state.combo.chain >= 2) {
                playTone(580 + Math.min(state.combo.chain, 10) * 18, 45);
              }

              const chainJump = jump || state.jumpBufferTimer > 0;
              if (chainJump) {
                const highSpeedBounce =
                  Math.abs(state.player.vx) >= worldConfig.moveSpeed * 1.08;
                const bounceBoost = highSpeedBounce
                  ? 40 + state.runMomentum * 110
                  : 12;

                state.player.vy =
                  computeJumpVelocity(state.player.vx) - bounceBoost;
                if (highSpeedBounce) {
                  state.player.vx *= 1.03 + state.runMomentum * 0.09;
                }
                state.grounded = false;
                state.coyoteTimer = 0;
                state.jumpedThisPress = true;
                state.jumpBufferTimer = 0;
                playTone(500 + state.runMomentum * 140, 40);
              } else {
                state.jumpedThisPress = false;
              }
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
          const width =
            clamp(120 - Math.min(state.bestFloorThisRun, 60), 52, 120) +
            rand() * 12;
          const spacing =
            65 + rand() * 64 + Math.min(state.bestFloorThisRun, 90) * 0.45;
          const x = clamp(
            rand() * (worldConfig.arenaWidth - width),
            14,
            worldConfig.arenaWidth - width - 14
          );
          const roll = rand();
          const kind: PlatformKind =
            roll > 0.78 ? 'ice' : roll > 0.56 ? 'wood' : 'stone';
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
          (platform) =>
            platform.y < state.cameraY + worldConfig.viewportHeight + 220
        );

        const playerBottom = state.player.y + state.player.height;
        if (
          playerBottom > state.risingY ||
          playerBottom > state.cameraY + worldConfig.viewportHeight + 160
        ) {
          state.gameOver = true;
          onRunEnd({
            score: state.score,
            floor: state.bestFloorThisRun,
            combo: state.combo.maxChain,
            playtimeSeconds: state.playtimeSeconds,
            ...(replay
              ? { isReplay: true }
              : {
                  replay: {
                    version: 1,
                    mode,
                    character,
                    ...(challenge?.id ? { challengeId: challenge.id } : {}),
                    createdAt: Date.now(),
                    durationSeconds: state.playtimeSeconds,
                    score: state.score,
                    floor: state.bestFloorThisRun,
                    combo: state.combo.maxChain,
                    events: recordingRef.current,
                  },
                }),
          });
        }

        if (mode === 'timeattack' && state.elapsedSeconds >= 60) {
          state.gameOver = true;
          onRunEnd({
            score: state.score,
            floor: state.bestFloorThisRun,
            combo: state.combo.maxChain,
            playtimeSeconds: state.playtimeSeconds,
            ...(replay
              ? { isReplay: true }
              : {
                  replay: {
                    version: 1,
                    mode,
                    character,
                    ...(challenge?.id ? { challengeId: challenge.id } : {}),
                    createdAt: Date.now(),
                    durationSeconds: state.playtimeSeconds,
                    score: state.score,
                    floor: state.bestFloorThisRun,
                    combo: state.combo.maxChain,
                    events: recordingRef.current,
                  },
                }),
          });
        }

        if (mode === 'challenge' && challenge) {
          const floorOk =
            challenge.targetFloor !== undefined &&
            state.bestFloorThisRun >= challenge.targetFloor;
          const scoreOk =
            challenge.targetScore !== undefined &&
            state.score >= challenge.targetScore;
          const comboOk =
            challenge.targetCombo !== undefined &&
            state.combo.maxChain >= challenge.targetCombo;
          const timeExpired =
            challenge.timeLimitSeconds !== undefined &&
            state.elapsedSeconds >= challenge.timeLimitSeconds;

          if (floorOk || scoreOk || comboOk) {
            state.score += state.challengeTargetScore;
            state.challengeCompleted = true;
            state.gameOver = true;
            onRunEnd({
              score: state.score,
              floor: state.bestFloorThisRun,
              combo: state.combo.maxChain,
              playtimeSeconds: state.playtimeSeconds,
              ...(replay
                ? { isReplay: true }
                : {
                    replay: {
                      version: 1,
                      mode,
                      character,
                      ...(challenge?.id ? { challengeId: challenge.id } : {}),
                      createdAt: Date.now(),
                      durationSeconds: state.playtimeSeconds,
                      score: state.score,
                      floor: state.bestFloorThisRun,
                      combo: state.combo.maxChain,
                      events: recordingRef.current,
                    },
                  }),
            });
          } else if (timeExpired) {
            state.challengeCompleted = false;
            state.gameOver = true;
            onRunEnd({
              score: state.score,
              floor: state.bestFloorThisRun,
              combo: state.combo.maxChain,
              playtimeSeconds: state.playtimeSeconds,
              ...(replay
                ? { isReplay: true }
                : {
                    replay: {
                      version: 1,
                      mode,
                      character,
                      ...(challenge?.id ? { challengeId: challenge.id } : {}),
                      createdAt: Date.now(),
                      durationSeconds: state.playtimeSeconds,
                      score: state.score,
                      floor: state.bestFloorThisRun,
                      combo: state.combo.maxChain,
                      events: recordingRef.current,
                    },
                  }),
            });
          }
        }
      }

      const cw = canvas.width;
      const ch = canvas.height;

      const gradient = ctx.createLinearGradient(0, 0, 0, ch);
      gradient.addColorStop(0, '#0b486b');
      gradient.addColorStop(0.5, '#154b63');
      gradient.addColorStop(1, '#001220');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cw, ch);

      const stateNow = stateRef.current;

      for (let i = 0; i < 56; i += 1) {
        const x =
          ((i * 41) % cw) + Math.sin(stateNow.elapsedSeconds * 1.4 + i) * 12;
        const y = ((stateNow.elapsedSeconds * 140 + i * 38) % (ch + 90)) - 45;
        const len = 10 + (i % 7) * 3;
        ctx.strokeStyle = `rgba(190, 235, 255, ${0.08 + (i % 5) * 0.02})`;
        ctx.lineWidth = 1 + (i % 3) * 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + len);
        ctx.stroke();
      }

      for (const platform of stateNow.platforms) {
        const sy = platform.y - stateNow.cameraY;
        if (sy < -20 || sy > ch + 30) continue;
        ctx.fillStyle = platformColor(platform.kind);
        ctx.fillRect(platform.x, sy, platform.width, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(platform.x, sy, platform.width, 3);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.strokeRect(platform.x, sy, platform.width, 12);
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
      const shakeX =
        settings.screenShakeEnabled && stateNow.combo.chain >= 4
          ? Math.sin(stateNow.elapsedSeconds * 90) * 2
          : 0;
      const shakeY =
        settings.screenShakeEnabled && stateNow.combo.chain >= 4
          ? Math.cos(stateNow.elapsedSeconds * 80) * 2
          : 0;

      ctx.save();
      ctx.translate(
        stateNow.player.x + stateNow.player.width / 2 + shakeX,
        py + stateNow.player.height / 2 + shakeY
      );
      ctx.rotate(stateNow.player.vx * 0.0035);

      const bodyW = stateNow.player.width;
      const bodyH = stateNow.player.height;
      const leftEyeX =
        stateNow.player.vx > 20 ? 1 : stateNow.player.vx < -20 ? -7 : -5;
      const rightEyeX =
        stateNow.player.vx > 20 ? 7 : stateNow.player.vx < -20 ? -1 : 5;

      ctx.fillStyle = colorMap.body;
      ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

      ctx.fillStyle = colorMap.band;
      ctx.fillRect(-bodyW / 2, -bodyH / 2 + 3, bodyW, 4);

      ctx.fillStyle = colorMap.belt;
      ctx.fillRect(-bodyW / 2, -3, bodyW, 10);

      ctx.fillStyle = '#12232f';
      ctx.fillRect(leftEyeX, -8, 3, 3);
      ctx.fillRect(rightEyeX, -8, 3, 3);

      ctx.fillStyle = colorMap.belt;
      if (stateNow.grounded) {
        ctx.fillRect(-bodyW / 2 - 3, 6, 3, 7);
        ctx.fillRect(bodyW / 2, 6, 3, 7);
      } else {
        ctx.fillRect(-bodyW / 2 - 3, -12, 3, 8);
        ctx.fillRect(bodyW / 2, -12, 3, 8);
      }

      if (settings.comboTextEnabled && stateNow.combo.chain >= 5) {
        const comboText =
          stateNow.combo.chain >= 20
            ? 'Amazing!'
            : stateNow.combo.chain >= 10
              ? 'Excellent!'
              : 'Super!';
        ctx.font = '700 24px "Trebuchet MS", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(comboText, cw / 2, 70);
      }

      ctx.restore();

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
        (worldConfig.viewportHeight + 80 - stateNow.risingY) /
          (worldConfig.viewportHeight + 80),
        0,
        1
      );

      onState({
        score: stateNow.score,
        floor: stateNow.bestFloorThisRun,
        combo: stateNow.combo.chain,
        comboTimer: stateNow.combo.timer,
        comboText:
          stateNow.combo.chain >= 20
            ? 'Amazing!'
            : stateNow.combo.chain >= 10
              ? 'Excellent!'
              : stateNow.combo.chain >= 5
                ? 'Super!'
                : null,
        risingProgress,
        elapsedSeconds: stateNow.elapsedSeconds,
        modeCompleted: mode === 'challenge' && stateNow.challengeCompleted,
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
  }, [
    character,
    challenge,
    isPaused,
    mode,
    onPauseToggle,
    onRunEnd,
    onState,
    playTone,
    replay,
    colorMap,
    settings.comboTextEnabled,
    settings.screenShakeEnabled,
  ]);

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={worldConfig.arenaWidth}
        height={worldConfig.viewportHeight}
        className="w-full max-w-[420px] rounded-2xl border border-black/10 bg-sky-50 shadow-xl"
      />
      {touchDevice ? (
        <div className="mt-1 grid grid-cols-4 gap-2">
          <button
            type="button"
            onPointerDown={() => {
              keysRef.current.left = true;
            }}
            onPointerUp={() => {
              keysRef.current.left = false;
            }}
            onPointerCancel={() => {
              keysRef.current.left = false;
            }}
            onPointerLeave={() => {
              keysRef.current.left = false;
            }}
            className="rounded-2xl border border-cyan-100/20 bg-slate-900/80 px-3 py-3 text-sm font-semibold text-cyan-50 shadow-lg"
            style={{ touchAction: 'none' }}
          >
            Left
          </button>
          <button
            type="button"
            onPointerDown={() => {
              stateRef.current.jumpBufferTimer = worldConfig.coyoteWindow;
              keysRef.current.jump = true;
            }}
            onPointerUp={() => {
              keysRef.current.jump = false;
              stateRef.current.jumpedThisPress = false;
            }}
            onPointerCancel={() => {
              keysRef.current.jump = false;
              stateRef.current.jumpedThisPress = false;
            }}
            onPointerLeave={() => {
              keysRef.current.jump = false;
              stateRef.current.jumpedThisPress = false;
            }}
            className="rounded-2xl border border-amber-200/30 bg-amber-500/80 px-3 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ touchAction: 'none' }}
          >
            Jump
          </button>
          <button
            type="button"
            onPointerDown={() => {
              keysRef.current.right = true;
            }}
            onPointerUp={() => {
              keysRef.current.right = false;
            }}
            onPointerCancel={() => {
              keysRef.current.right = false;
            }}
            onPointerLeave={() => {
              keysRef.current.right = false;
            }}
            className="rounded-2xl border border-cyan-100/20 bg-slate-900/80 px-3 py-3 text-sm font-semibold text-cyan-50 shadow-lg"
            style={{ touchAction: 'none' }}
          >
            Right
          </button>
          <button
            type="button"
            onPointerDown={() => {
              keysRef.current.run = true;
            }}
            onPointerUp={() => {
              keysRef.current.run = false;
            }}
            onPointerCancel={() => {
              keysRef.current.run = false;
            }}
            onPointerLeave={() => {
              keysRef.current.run = false;
            }}
            className="rounded-2xl border border-emerald-200/30 bg-emerald-600/80 px-3 py-3 text-sm font-semibold text-white shadow-lg"
            style={{ touchAction: 'none' }}
          >
            Run
          </button>
        </div>
      ) : null}
      {!touchDevice ? (
        <p className="px-1 text-[11px] font-medium text-slate-600">
          Move: A/D or Arrow keys. Run: Shift + Left/Right. Jump: W/Up/Space
          (hold to chain). Pause: {settings.keybindings.pause}.
        </p>
      ) : null}
    </div>
  );
};
