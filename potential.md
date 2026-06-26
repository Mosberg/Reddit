You gave a really good spec already—so let’s turn that into a clean, extensible game engine plus a Devvit integration layer.

Below is a **two-layer architecture**:

- **Core engine** – pure TypeScript, no Devvit dependencies (easy to test and tweak).
- **Devvit glue** – hooks the engine into Reddit Devvit (rendering + input + loop).

You can drop this into a Devvit project and wire up rendering to whatever Devvit canvas/UI primitives you prefer.

---

### 1. Core engine – `IcyTowerEngine.ts`

```ts
// IcyTowerEngine.ts

export type PlatformType = "stone" | "ice" | "wood";

export interface Platform {
  id: number;
  floor: number;
  x: number;
  y: number;
  width: number;
  type: PlatformType;
}

export interface ComboState {
  active: boolean;
  lastFloorTouched: number;
  currentComboFloorsSkipped: number;
  comboTimer: number; // seconds remaining
  multiplier: number;
}

export interface ScoreState {
  floorReached: number;
  totalScore: number;
  bestComboFloorsSkipped: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  currentFloor: number;
}

export interface GameConfig {
  gravity: number;
  moveAcceleration: number;
  maxRunSpeed: number;
  frictionGround: number;
  frictionIce: number;
  frictionAir: number;
  jumpSpeedBase: number;
  jumpSpeedBonusFromRun: number;
  comboTimerDuration: number;
  risingFloorBaseSpeed: number;
  risingFloorSpeedIncreasePerFloor: number;
  platformBaseSpacing: number;
  platformSpacingIncreasePerFloor: number;
  platformBaseWidth: number;
  platformWidthDecreasePerFloor: number;
  worldWidth: number;
  worldHeight: number;
}

export interface GameState {
  player: PlayerState;
  platforms: Platform[];
  combo: ComboState;
  score: ScoreState;
  risingFloorY: number;
  risingFloorSpeed: number;
  highestGeneratedFloor: number;
  isGameOver: boolean;
  timeElapsed: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export class IcyTowerEngine {
  public state: GameState;
  public config: GameConfig;

  private jumpPressedLastFrame = false;

  constructor(config?: Partial<GameConfig>) {
    this.config = {
      gravity: 1800,
      moveAcceleration: 3000,
      maxRunSpeed: 550,
      frictionGround: 2200,
      frictionIce: 800,
      frictionAir: 400,
      jumpSpeedBase: 750,
      jumpSpeedBonusFromRun: 250,
      comboTimerDuration: 1.0,
      risingFloorBaseSpeed: 80,
      risingFloorSpeedIncreasePerFloor: 0.15,
      platformBaseSpacing: 80,
      platformSpacingIncreasePerFloor: 0.4,
      platformBaseWidth: 220,
      platformWidthDecreasePerFloor: 0.4,
      worldWidth: 400,
      worldHeight: 600,
      ...config,
    };

    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const player: PlayerState = {
      x: this.config.worldWidth / 2,
      y: this.config.worldHeight - 80,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      onGround: false,
      currentFloor: 1,
    };

    const platforms: Platform[] = [];
    // Floor 1 – starting platform
    platforms.push({
      id: 1,
      floor: 1,
      x: this.config.worldWidth / 2 - this.config.platformBaseWidth / 2,
      y: this.config.worldHeight - 40,
      width: this.config.platformBaseWidth,
      type: "stone",
    });

    const combo: ComboState = {
      active: false,
      lastFloorTouched: 1,
      currentComboFloorsSkipped: 0,
      comboTimer: 0,
      multiplier: 1,
    };

    const score: ScoreState = {
      floorReached: 1,
      totalScore: 0,
      bestComboFloorsSkipped: 0,
    };

    return {
      player,
      platforms,
      combo,
      score,
      risingFloorY: this.config.worldHeight,
      risingFloorSpeed: this.config.risingFloorBaseSpeed,
      highestGeneratedFloor: 1,
      isGameOver: false,
      timeElapsed: 0,
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.jumpPressedLastFrame = false;
  }

  // Main update loop – dt in seconds
  public update(dt: number, input: InputState): void {
    if (this.state.isGameOver) return;

    this.state.timeElapsed += dt;

    this.updateRisingFloor(dt);
    this.updatePlayerPhysics(dt, input);
    this.handlePlatformCollisions();
    this.updateCombo(dt);
    this.updateScore();
    this.ensurePlatformsAhead();
    this.checkGameOver();
  }

  private updateRisingFloor(dt: number): void {
    const floorFactor =
      this.state.score.floorReached *
      this.config.risingFloorSpeedIncreasePerFloor;
    this.state.risingFloorSpeed =
      this.config.risingFloorBaseSpeed + floorFactor;
    this.state.risingFloorY -= this.state.risingFloorSpeed * dt;
  }

  private updatePlayerPhysics(dt: number, input: InputState): void {
    const p = this.state.player;

    // Horizontal movement
    let targetAccel = 0;
    if (input.left) targetAccel -= this.config.moveAcceleration;
    if (input.right) targetAccel += this.config.moveAcceleration;

    const currentPlatform = this.getPlatformUnderPlayer();
    const onIce = currentPlatform?.type === "ice";

    const friction = p.onGround
      ? onIce
        ? this.config.frictionIce
        : this.config.frictionGround
      : this.config.frictionAir;

    // Apply acceleration
    p.vx += targetAccel * dt;

    // Apply friction
    if (!input.left && !input.right) {
      if (p.vx > 0) {
        p.vx = Math.max(0, p.vx - friction * dt);
      } else if (p.vx < 0) {
        p.vx = Math.min(0, p.vx + friction * dt);
      }
    }

    // Clamp run speed
    if (p.vx > this.config.maxRunSpeed) p.vx = this.config.maxRunSpeed;
    if (p.vx < -this.config.maxRunSpeed) p.vx = -this.config.maxRunSpeed;

    // Jump (edge-trigger)
    const jumpPressedNow = input.jump;
    const jumpJustPressed = jumpPressedNow && !this.jumpPressedLastFrame;
    this.jumpPressedLastFrame = jumpPressedNow;

    if (jumpJustPressed && p.onGround) {
      const runFactor = Math.min(Math.abs(p.vx) / this.config.maxRunSpeed, 1.0);
      const bonus = runFactor * this.config.jumpSpeedBonusFromRun;
      p.vy = -(this.config.jumpSpeedBase + bonus);
      p.onGround = false;
    }

    // Gravity
    p.vy += this.config.gravity * dt;

    // Integrate position
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // World bounds (horizontal wrap or clamp)
    if (p.x < 0) p.x = 0;
    if (p.x + p.width > this.config.worldWidth)
      p.x = this.config.worldWidth - p.width;
  }

  private getPlatformUnderPlayer(): Platform | undefined {
    const p = this.state.player;
    const epsilon = 2;

    return this.state.platforms.find((plat) => {
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;
      const nearY = Math.abs(p.y + p.height - plat.y) <= epsilon;
      return withinX && nearY;
    });
  }

  private handlePlatformCollisions(): void {
    const p = this.state.player;

    // Simple one-way platform collision from above
    let landedPlatform: Platform | undefined;

    for (const plat of this.state.platforms) {
      const wasAbove = p.y + p.height <= plat.y;
      const nowBelowOrOn = p.y + p.height >= plat.y;
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;

      if (wasAbove && nowBelowOrOn && withinX && p.vy >= 0) {
        // Land on platform
        p.y = plat.y - p.height;
        p.vy = 0;
        p.onGround = true;
        landedPlatform = plat;
        break;
      }
    }

    if (!landedPlatform) {
      p.onGround = false;
      return;
    }

    // Floor tracking
    const previousFloor = this.state.player.currentFloor;
    const newFloor = landedPlatform.floor;
    this.state.player.currentFloor = newFloor;

    if (newFloor > this.state.score.floorReached) {
      this.state.score.floorReached = newFloor;
    }

    // Combo logic
    const floorsSkipped = newFloor - previousFloor;
    if (floorsSkipped >= 2) {
      this.startOrExtendCombo(floorsSkipped, newFloor);
    } else {
      this.breakComboIfActive();
    }
  }

  private startOrExtendCombo(floorsSkipped: number, newFloor: number): void {
    const combo = this.state.combo;

    if (!combo.active) {
      combo.active = true;
      combo.currentComboFloorsSkipped = floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    } else {
      combo.currentComboFloorsSkipped += floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    }

    // Update multiplier based on combo size
    combo.multiplier = 1 + Math.floor(combo.currentComboFloorsSkipped / 3);

    if (
      combo.currentComboFloorsSkipped > this.state.score.bestComboFloorsSkipped
    ) {
      this.state.score.bestComboFloorsSkipped = combo.currentComboFloorsSkipped;
    }
  }

  private breakComboIfActive(): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    // Apply final combo score bonus
    const bonus = combo.currentComboFloorsSkipped * 10 * combo.multiplier;
    this.state.score.totalScore += bonus;

    combo.active = false;
    combo.currentComboFloorsSkipped = 0;
    combo.comboTimer = 0;
    combo.multiplier = 1;
  }

  private updateCombo(dt: number): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    combo.comboTimer -= dt;
    if (combo.comboTimer <= 0) {
      this.breakComboIfActive();
    }
  }

  private updateScore(): void {
    // Base score from floor reached
    const baseFloorScore = this.state.score.floorReached * 5;
    this.state.score.totalScore = baseFloorScore;
    // Combo bonuses are added when combos break (see breakComboIfActive)
  }

  private ensurePlatformsAhead(): void {
    const targetMaxFloor = this.state.score.floorReached + 30;

    while (this.state.highestGeneratedFloor < targetMaxFloor) {
      const nextFloor = this.state.highestGeneratedFloor + 1;
      const spacing =
        this.config.platformBaseSpacing +
        nextFloor * this.config.platformSpacingIncreasePerFloor;
      const width = Math.max(
        40,
        this.config.platformBaseWidth -
          nextFloor * this.config.platformWidthDecreasePerFloor,
      );

      const lastPlatform = this.state.platforms.find(
        (p) => p.floor === this.state.highestGeneratedFloor,
      );
      const baseY = lastPlatform
        ? lastPlatform.y
        : this.config.worldHeight - 40;
      const newY = baseY - spacing;

      const x = Math.random() * (this.config.worldWidth - width);

      const type: PlatformType =
        nextFloor < 50 ? "stone" : nextFloor < 150 ? "wood" : "ice";

      this.state.platforms.push({
        id: nextFloor,
        floor: nextFloor,
        x,
        y: newY,
        width,
        type,
      });

      this.state.highestGeneratedFloor = nextFloor;
    }

    // Optional: cull platforms far below rising floor
    this.state.platforms = this.state.platforms.filter(
      (p) => p.y > this.state.risingFloorY - 200,
    );
  }

  private checkGameOver(): void {
    const p = this.state.player;
    if (p.y > this.state.risingFloorY) {
      this.state.isGameOver = true;
    }
  }

  // Helper for UI: get combo feedback text
  public getComboText(): string | null {
    const combo = this.state.combo;
    if (!combo.active) return null;

    const skipped = combo.currentComboFloorsSkipped;
    if (skipped >= 20) return "Amazing!";
    if (skipped >= 10) return "Excellent!";
    if (skipped >= 5) return "Super!";
    return null;
  }
}
```

---

### 2. Devvit integration – `IcyTowerDevvit.ts`

This is a **minimal Devvit wiring** example. You’ll likely adapt rendering to your actual Devvit canvas / UI APIs.

```ts
// IcyTowerDevvit.ts

import { Devvit } from "@devvit/public-api";
import { IcyTowerEngine, InputState } from "./IcyTowerEngine";

const engine = new IcyTowerEngine();

let lastTimestamp = 0;
let inputState: InputState = {
  left: false,
  right: false,
  jump: false,
};

Devvit.addCustomPostType({
  name: "Icy Tower",
  description: "Vertical platformer – climb as high as you can!",
  render: (context) => {
    const { ui } = context;

    // Basic keyboard handling (adapt to Devvit’s actual input APIs)
    ui.onKeyDown((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = true;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = true;
          break;
      }
    });

    ui.onKeyUp((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = false;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = false;
          break;
      }
    });

    // Main loop – use whatever timing Devvit provides (animation frame, interval, etc.)
    ui.onAnimationFrame((timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dtMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const dt = dtMs / 1000;
      engine.update(dt, inputState);

      const state = engine.state;

      // Simple rendering example – replace with Devvit canvas drawing
      ui.draw((canvas) => {
        canvas.clear("#00111f");

        // Rising floor
        canvas.fillStyle = "#223344";
        canvas.fillRect(0, state.risingFloorY, engine.config.worldWidth, 10);

        // Platforms
        for (const plat of state.platforms) {
          switch (plat.type) {
            case "stone":
              canvas.fillStyle = "#777777";
              break;
            case "wood":
              canvas.fillStyle = "#aa7744";
              break;
            case "ice":
              canvas.fillStyle = "#66ccff";
              break;
          }
          canvas.fillRect(plat.x, plat.y, plat.width, 8);
        }

        // Player (Harold)
        canvas.fillStyle = "#ffdd33";
        canvas.fillRect(
          state.player.x,
          state.player.y,
          state.player.width,
          state.player.height,
        );

        // HUD – floor & score
        canvas.fillStyle = "#ffffff";
        canvas.font = "16px sans-serif";
        canvas.fillText(`Floor: ${state.score.floorReached}`, 10, 20);
        canvas.fillText(`Score: ${Math.floor(state.score.totalScore)}`, 10, 40);

        // Combo meter
        if (state.combo.active) {
          const comboText = engine.getComboText();
          const ratio =
            state.combo.comboTimer / engine.config.comboTimerDuration;

          canvas.fillStyle = "#ff66aa";
          canvas.fillRect(10, 60, 120 * ratio, 8);

          if (comboText) {
            canvas.fillText(comboText, 10, 85);
          }
        }

        // Game over
        if (state.isGameOver) {
          canvas.fillStyle = "rgba(0,0,0,0.6)";
          canvas.fillRect(
            0,
            0,
            engine.config.worldWidth,
            engine.config.worldHeight,
          );
          canvas.fillStyle = "#ffffff";
          canvas.font = "24px sans-serif";
          canvas.fillText("Game Over", 120, 260);
          canvas.font = "16px sans-serif";
          canvas.fillText(`Floor: ${state.score.floorReached}`, 130, 290);
          canvas.fillText(
            `Score: ${Math.floor(state.score.totalScore)}`,
            130,
            310,
          );
          canvas.fillText("Press R to restart", 110, 340);
        }
      });
    });

    // Restart key
    ui.onKeyDown((event) => {
      if (event.key === "KeyR" && engine.state.isGameOver) {
        engine.reset();
      }
    });

    // Return some root UI element if needed by Devvit (e.g., canvas component)
    return ui.canvas({
      width: engine.config.worldWidth,
      height: engine.config.worldHeight,
    });
  },
});
```

---

If you want, next step we can:

- Add **modes** (classic, time attack, challenges) as separate configs.
- Wire **profiles, stats, and leaderboards** to Devvit storage.
- Tune physics to feel closer to original Icy Tower (jump timing, friction, spacing).

---\*\*\*---

### Updated core: modes, tuned physics, combo-friendly spacing

Here’s an updated engine with:

- **Modes:** `classic`, `timeAttack`, `challenge`
- **Tuned physics:** snappier jumps, more momentum, tighter spacing
- **Hooks for stats/leaderboards:** engine emits summary; Devvit layer persists

---

#### `IcyTowerEngine.ts`

```ts
// IcyTowerEngine.ts

export type PlatformType = "stone" | "ice" | "wood";

export type GameMode = "classic" | "timeAttack" | "challenge";

export interface Platform {
  id: number;
  floor: number;
  x: number;
  y: number;
  width: number;
  type: PlatformType;
}

export interface ComboState {
  active: boolean;
  lastFloorTouched: number;
  currentComboFloorsSkipped: number;
  comboTimer: number; // seconds remaining
  multiplier: number;
}

export interface ScoreState {
  floorReached: number;
  totalScore: number;
  bestComboFloorsSkipped: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  currentFloor: number;
}

export interface GameConfig {
  gravity: number;
  moveAcceleration: number;
  maxRunSpeed: number;
  frictionGround: number;
  frictionIce: number;
  frictionAir: number;
  jumpSpeedBase: number;
  jumpSpeedBonusFromRun: number;
  comboTimerDuration: number;
  risingFloorBaseSpeed: number;
  risingFloorSpeedIncreasePerFloor: number;
  platformBaseSpacing: number;
  platformSpacingIncreasePerFloor: number;
  platformBaseWidth: number;
  platformWidthDecreasePerFloor: number;
  worldWidth: number;
  worldHeight: number;

  // Mode-specific
  mode: GameMode;
  timeLimitSeconds?: number; // for timeAttack
  challengeTargetFloor?: number;
  challengeTargetScore?: number;
}

export interface GameState {
  player: PlayerState;
  platforms: Platform[];
  combo: ComboState;
  score: ScoreState;
  risingFloorY: number;
  risingFloorSpeed: number;
  highestGeneratedFloor: number;
  isGameOver: boolean;
  timeElapsed: number;
  mode: GameMode;
  modeCompleted: boolean; // for challenges / time attack
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface GameSummary {
  mode: GameMode;
  floorReached: number;
  totalScore: number;
  bestComboFloorsSkipped: number;
  timeElapsed: number;
  modeCompleted: boolean;
}

export class IcyTowerEngine {
  public state: GameState;
  public config: GameConfig;

  private jumpPressedLastFrame = false;

  constructor(config?: Partial<GameConfig>) {
    // Tuned physics – closer to Icy Tower feel:
    // - Strong gravity
    // - High acceleration
    // - High max run speed
    // - Ice much lower friction
    this.config = {
      gravity: 2200,
      moveAcceleration: 3800,
      maxRunSpeed: 650,
      frictionGround: 2600,
      frictionIce: 900,
      frictionAir: 500,
      jumpSpeedBase: 820,
      jumpSpeedBonusFromRun: 320,
      comboTimerDuration: 1.1,
      risingFloorBaseSpeed: 90,
      risingFloorSpeedIncreasePerFloor: 0.18,
      platformBaseSpacing: 90,
      platformSpacingIncreasePerFloor: 0.45,
      platformBaseWidth: 230,
      platformWidthDecreasePerFloor: 0.45,
      worldWidth: 400,
      worldHeight: 600,
      mode: "classic",
      ...config,
    };

    this.state = this.createInitialState();
  }

  public setMode(mode: GameMode, overrides?: Partial<GameConfig>): void {
    this.config = {
      ...this.config,
      mode,
      ...overrides,
    };
    this.reset();
  }

  private createInitialState(): GameState {
    const player: PlayerState = {
      x: this.config.worldWidth / 2,
      y: this.config.worldHeight - 80,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      onGround: false,
      currentFloor: 1,
    };

    const platforms: Platform[] = [];
    platforms.push({
      id: 1,
      floor: 1,
      x: this.config.worldWidth / 2 - this.config.platformBaseWidth / 2,
      y: this.config.worldHeight - 40,
      width: this.config.platformBaseWidth,
      type: "stone",
    });

    const combo: ComboState = {
      active: false,
      lastFloorTouched: 1,
      currentComboFloorsSkipped: 0,
      comboTimer: 0,
      multiplier: 1,
    };

    const score: ScoreState = {
      floorReached: 1,
      totalScore: 0,
      bestComboFloorsSkipped: 0,
    };

    return {
      player,
      platforms,
      combo,
      score,
      risingFloorY: this.config.worldHeight,
      risingFloorSpeed: this.config.risingFloorBaseSpeed,
      highestGeneratedFloor: 1,
      isGameOver: false,
      timeElapsed: 0,
      mode: this.config.mode,
      modeCompleted: false,
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.jumpPressedLastFrame = false;
  }

  public update(dt: number, input: InputState): void {
    if (this.state.isGameOver) return;

    this.state.timeElapsed += dt;

    // Time attack mode: hard time limit
    if (this.config.mode === "timeAttack" && this.config.timeLimitSeconds) {
      if (this.state.timeElapsed >= this.config.timeLimitSeconds) {
        this.state.isGameOver = true;
        this.state.modeCompleted = true; // run ended by time
        return;
      }
    }

    this.updateRisingFloor(dt);
    this.updatePlayerPhysics(dt, input);
    this.handlePlatformCollisions();
    this.updateCombo(dt);
    this.updateScore();
    this.ensurePlatformsAhead();
    this.checkGameOver();
    this.checkChallengeCompletion();
  }

  private updateRisingFloor(dt: number): void {
    const floorFactor =
      this.state.score.floorReached *
      this.config.risingFloorSpeedIncreasePerFloor;

    let base = this.config.risingFloorBaseSpeed;

    if (this.config.mode === "timeAttack") {
      base *= 1.3; // more pressure
    }

    this.state.risingFloorSpeed = base + floorFactor;
    this.state.risingFloorY -= this.state.risingFloorSpeed * dt;
  }

  private updatePlayerPhysics(dt: number, input: InputState): void {
    const p = this.state.player;

    let targetAccel = 0;
    if (input.left) targetAccel -= this.config.moveAcceleration;
    if (input.right) targetAccel += this.config.moveAcceleration;

    const currentPlatform = this.getPlatformUnderPlayer();
    const onIce = currentPlatform?.type === "ice";

    const friction = p.onGround
      ? onIce
        ? this.config.frictionIce
        : this.config.frictionGround
      : this.config.frictionAir;

    p.vx += targetAccel * dt;

    if (!input.left && !input.right) {
      if (p.vx > 0) {
        p.vx = Math.max(0, p.vx - friction * dt);
      } else if (p.vx < 0) {
        p.vx = Math.min(0, p.vx + friction * dt);
      }
    }

    if (p.vx > this.config.maxRunSpeed) p.vx = this.config.maxRunSpeed;
    if (p.vx < -this.config.maxRunSpeed) p.vx = -this.config.maxRunSpeed;

    const jumpPressedNow = input.jump;
    const jumpJustPressed = jumpPressedNow && !this.jumpPressedLastFrame;
    this.jumpPressedLastFrame = jumpPressedNow;

    if (jumpJustPressed && p.onGround) {
      const runFactor = Math.min(Math.abs(p.vx) / this.config.maxRunSpeed, 1.0);
      const bonus = runFactor * this.config.jumpSpeedBonusFromRun;
      p.vy = -(this.config.jumpSpeedBase + bonus);
      p.onGround = false;
    }

    p.vy += this.config.gravity * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 0) p.x = 0;
    if (p.x + p.width > this.config.worldWidth)
      p.x = this.config.worldWidth - p.width;
  }

  private getPlatformUnderPlayer(): Platform | undefined {
    const p = this.state.player;
    const epsilon = 2;

    return this.state.platforms.find((plat) => {
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;
      const nearY = Math.abs(p.y + p.height - plat.y) <= epsilon;
      return withinX && nearY;
    });
  }

  private handlePlatformCollisions(): void {
    const p = this.state.player;
    let landedPlatform: Platform | undefined;

    for (const plat of this.state.platforms) {
      const wasAbove = p.y + p.height <= plat.y;
      const nowBelowOrOn = p.y + p.height >= plat.y;
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;

      if (wasAbove && nowBelowOrOn && withinX && p.vy >= 0) {
        p.y = plat.y - p.height;
        p.vy = 0;
        p.onGround = true;
        landedPlatform = plat;
        break;
      }
    }

    if (!landedPlatform) {
      p.onGround = false;
      return;
    }

    const previousFloor = this.state.player.currentFloor;
    const newFloor = landedPlatform.floor;
    this.state.player.currentFloor = newFloor;

    if (newFloor > this.state.score.floorReached) {
      this.state.score.floorReached = newFloor;
    }

    const floorsSkipped = newFloor - previousFloor;
    if (floorsSkipped >= 2) {
      this.startOrExtendCombo(floorsSkipped, newFloor);
    } else {
      this.breakComboIfActive();
    }
  }

  private startOrExtendCombo(floorsSkipped: number, newFloor: number): void {
    const combo = this.state.combo;

    if (!combo.active) {
      combo.active = true;
      combo.currentComboFloorsSkipped = floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    } else {
      combo.currentComboFloorsSkipped += floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    }

    combo.multiplier = 1 + Math.floor(combo.currentComboFloorsSkipped / 3);

    if (
      combo.currentComboFloorsSkipped > this.state.score.bestComboFloorsSkipped
    ) {
      this.state.score.bestComboFloorsSkipped = combo.currentComboFloorsSkipped;
    }
  }

  private breakComboIfActive(): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    const bonus = combo.currentComboFloorsSkipped * 10 * combo.multiplier;
    this.state.score.totalScore += bonus;

    combo.active = false;
    combo.currentComboFloorsSkipped = 0;
    combo.comboTimer = 0;
    combo.multiplier = 1;
  }

  private updateCombo(dt: number): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    combo.comboTimer -= dt;
    if (combo.comboTimer <= 0) {
      this.breakComboIfActive();
    }
  }

  private updateScore(): void {
    const baseFloorScore = this.state.score.floorReached * 5;
    this.state.score.totalScore = baseFloorScore;
  }

  private ensurePlatformsAhead(): void {
    const targetMaxFloor = this.state.score.floorReached + 30;

    while (this.state.highestGeneratedFloor < targetMaxFloor) {
      const nextFloor = this.state.highestGeneratedFloor + 1;
      const spacing =
        this.config.platformBaseSpacing +
        nextFloor * this.config.platformSpacingIncreasePerFloor;
      const width = Math.max(
        40,
        this.config.platformBaseWidth -
          nextFloor * this.config.platformWidthDecreasePerFloor,
      );

      const lastPlatform = this.state.platforms.find(
        (p) => p.floor === this.state.highestGeneratedFloor,
      );
      const baseY = lastPlatform
        ? lastPlatform.y
        : this.config.worldHeight - 40;
      const newY = baseY - spacing;

      const x = Math.random() * (this.config.worldWidth - width);

      const type: PlatformType =
        nextFloor < 50 ? "stone" : nextFloor < 150 ? "wood" : "ice";

      this.state.platforms.push({
        id: nextFloor,
        floor: nextFloor,
        x,
        y: newY,
        width,
        type,
      });

      this.state.highestGeneratedFloor = nextFloor;
    }

    this.state.platforms = this.state.platforms.filter(
      (p) => p.y > this.state.risingFloorY - 200,
    );
  }

  private checkGameOver(): void {
    const p = this.state.player;
    if (p.y > this.state.risingFloorY) {
      this.state.isGameOver = true;
    }
  }

  private checkChallengeCompletion(): void {
    if (this.config.mode !== "challenge") return;

    const floorTarget = this.config.challengeTargetFloor ?? 0;
    const scoreTarget = this.config.challengeTargetScore ?? 0;

    if (
      this.state.score.floorReached >= floorTarget ||
      this.state.score.totalScore >= scoreTarget
    ) {
      this.state.modeCompleted = true;
      this.state.isGameOver = true;
    }
  }

  public getComboText(): string | null {
    const combo = this.state.combo;
    if (!combo.active) return null;

    const skipped = combo.currentComboFloorsSkipped;
    if (skipped >= 20) return "Amazing!";
    if (skipped >= 10) return "Excellent!";
    if (skipped >= 5) return "Super!";
    return null;
  }

  public getSummary(): GameSummary {
    return {
      mode: this.state.mode,
      floorReached: this.state.score.floorReached,
      totalScore: this.state.totalScore,
      bestComboFloorsSkipped: this.state.score.bestComboFloorsSkipped,
      timeElapsed: this.state.timeElapsed,
      modeCompleted: this.state.modeCompleted,
    };
  }
}
```

---

### Devvit layer: modes, profiles, stats, leaderboards

Below is a sketch of how to:

- Select **mode** in UI
- Store **per-user profile & stats**
- Maintain a simple **global leaderboard** per mode

Adapt the storage APIs to your actual Devvit environment (KV, user storage, etc.).

#### `IcyTowerDevvit.ts`

```ts
// IcyTowerDevvit.ts

import { Devvit } from "@devvit/public-api";
import {
  IcyTowerEngine,
  InputState,
  GameMode,
  GameSummary,
} from "./IcyTowerEngine";

interface PlayerProfile {
  id: string; // user id
  name: string;
  totalFloors: number;
  bestFloor: number;
  totalScore: number;
  bestScore: number;
  totalCombos: number;
  longestCombo: number;
  totalPlaytimeSeconds: number;
  runsPlayed: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  mode: GameMode;
  bestFloor: number;
  bestScore: number;
}

const engine = new IcyTowerEngine();

let lastTimestamp = 0;
let inputState: InputState = { left: false, right: false, jump: false };
let currentMode: GameMode = "classic";

async function loadProfile(context: any): Promise<PlayerProfile> {
  const user = await context.user.getCurrentUser();
  const userId = user.id;
  const userName = user.username ?? "Player";

  const stored =
    await context.userStorage.get<PlayerProfile>("icytower_profile");
  if (stored) return stored;

  const profile: PlayerProfile = {
    id: userId,
    name: userName,
    totalFloors: 0,
    bestFloor: 0,
    totalScore: 0,
    bestScore: 0,
    totalCombos: 0,
    longestCombo: 0,
    totalPlaytimeSeconds: 0,
    runsPlayed: 0,
  };
  await context.userStorage.set("icytower_profile", profile);
  return profile;
}

async function saveProfile(
  context: any,
  profile: PlayerProfile,
): Promise<void> {
  await context.userStorage.set("icytower_profile", profile);
}

async function updateProfileFromSummary(
  context: any,
  profile: PlayerProfile,
  summary: GameSummary,
): Promise<void> {
  profile.runsPlayed += 1;
  profile.totalFloors += summary.floorReached;
  profile.totalScore += summary.totalScore;
  profile.totalPlaytimeSeconds += summary.timeElapsed;

  if (summary.floorReached > profile.bestFloor) {
    profile.bestFloor = summary.floorReached;
  }
  if (summary.totalScore > profile.bestScore) {
    profile.bestScore = summary.totalScore;
  }
  if (summary.bestComboFloorsSkipped > profile.longestCombo) {
    profile.longestCombo = summary.bestComboFloorsSkipped;
  }
  profile.totalCombos += summary.bestComboFloorsSkipped;

  await saveProfile(context, profile);
}

async function updateLeaderboard(
  context: any,
  summary: GameSummary,
  profile: PlayerProfile,
): Promise<void> {
  const key = `icytower_leaderboard_${summary.mode}`;
  const list = (await context.kvStore.get<LeaderboardEntry[]>(key)) ?? [];

  const existingIndex = list.findIndex((e) => e.userId === profile.id);

  const entry: LeaderboardEntry = {
    userId: profile.id,
    userName: profile.name,
    mode: summary.mode,
    bestFloor: summary.floorReached,
    bestScore: summary.totalScore,
  };

  if (existingIndex >= 0) {
    const prev = list[existingIndex];
    entry.bestFloor = Math.max(prev.bestFloor, entry.bestFloor);
    entry.bestScore = Math.max(prev.bestScore, entry.bestScore);
    list[existingIndex] = entry;
  } else {
    list.push(entry);
  }

  list.sort((a, b) => b.bestScore - a.bestScore);
  const trimmed = list.slice(0, 50);

  await context.kvStore.set(key, trimmed);
}

Devvit.addCustomPostType({
  name: "Icy Tower",
  description: "Climb the tower, chase combos, and compete on leaderboards.",
  render: (context) => {
    const { ui } = context;

    let profilePromise = loadProfile(context);

    // Mode selection UI (simple buttons)
    const modeSelector = ui.hstack({
      children: [
        ui.button({
          label: "Classic",
          onPress: () => {
            currentMode = "classic";
            engine.setMode("classic");
          },
        }),
        ui.button({
          label: "Time Attack",
          onPress: () => {
            currentMode = "timeAttack";
            engine.setMode("timeAttack", { timeLimitSeconds: 60 });
          },
        }),
        ui.button({
          label: "Challenge",
          onPress: () => {
            currentMode = "challenge";
            engine.setMode("challenge", {
              challengeTargetFloor: 100,
            });
          },
        }),
      ],
    });

    ui.onKeyDown((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = true;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = true;
          break;
        case "KeyR":
          if (engine.state.isGameOver) {
            engine.reset();
          }
          break;
      }
    });

    ui.onKeyUp((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = false;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = false;
          break;
      }
    });

    ui.onAnimationFrame(async (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dtMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const dt = dtMs / 1000;
      engine.update(dt, inputState);

      const state = engine.state;

      if (state.isGameOver) {
        const summary = engine.getSummary();
        const profile = await profilePromise;
        await updateProfileFromSummary(context, profile, summary);
        await updateLeaderboard(context, summary, profile);
      }

      ui.draw((canvas) => {
        canvas.clear("#00111f");

        canvas.fillStyle = "#223344";
        canvas.fillRect(0, state.risingFloorY, engine.config.worldWidth, 10);

        for (const plat of state.platforms) {
          switch (plat.type) {
            case "stone":
              canvas.fillStyle = "#777777";
              break;
            case "wood":
              canvas.fillStyle = "#aa7744";
              break;
            case "ice":
              canvas.fillStyle = "#66ccff";
              break;
          }
          canvas.fillRect(plat.x, plat.y, plat.width, 8);
        }

        canvas.fillStyle = "#ffdd33";
        canvas.fillRect(
          state.player.x,
          state.player.y,
          state.player.width,
          state.player.height,
        );

        canvas.fillStyle = "#ffffff";
        canvas.font = "16px sans-serif";
        canvas.fillText(`Mode: ${currentMode}`, 10, 20);
        canvas.fillText(`Floor: ${state.score.floorReached}`, 10, 40);
        canvas.fillText(`Score: ${Math.floor(state.score.totalScore)}`, 10, 60);

        if (state.combo.active) {
          const comboText = engine.getComboText();
          const ratio =
            state.combo.comboTimer / engine.config.comboTimerDuration;

          canvas.fillStyle = "#ff66aa";
          canvas.fillRect(10, 80, 120 * ratio, 8);

          if (comboText) {
            canvas.fillText(comboText, 10, 105);
          }
        }

        if (state.isGameOver) {
          canvas.fillStyle = "rgba(0,0,0,0.6)";
          canvas.fillRect(
            0,
            0,
            engine.config.worldWidth,
            engine.config.worldHeight,
          );
          canvas.fillStyle = "#ffffff";
          canvas.font = "24px sans-serif";
          canvas.fillText("Game Over", 120, 260);
          canvas.font = "16px sans-serif";
          canvas.fillText(`Floor: ${state.score.floorReached}`, 130, 290);
          canvas.fillText(
            `Score: ${Math.floor(state.score.totalScore)}`,
            130,
            310,
          );
          canvas.fillText("Press R to restart", 110, 340);
        }
      });
    });

    const canvasRoot = ui.canvas({
      width: engine.config.worldWidth,
      height: engine.config.worldHeight,
    });

    return ui.vstack({
      children: [modeSelector, canvasRoot],
    });
  },
});
```

---

If you want to go deeper, we can next:

- Add **challenge definitions** (combo targets, floor/time mixes) as data-driven configs.
- Render **leaderboard UI** in Devvit (top 10 per mode, highlight current player).
- Micro-tune jump arc (gravity vs jump speed) until it matches your muscle memory of Icy Tower.

---\*\*\*---

You’re building a legit Icy Tower remake here—let’s wire the “meta” layer properly.

Below is a focused upgrade:

- **Data-driven challenges** (combo/floor/time mixes)
- **Leaderboard UI** (top 10 per mode, highlight current player)
- **Micro-tuned jump arc** (snappy, momentum-friendly)

---

### 1. Engine: challenges + tuned jump arc

#### `IcyTowerEngine.ts` (delta-focused full file)

```ts
// IcyTowerEngine.ts

export type PlatformType = "stone" | "ice" | "wood";
export type GameMode = "classic" | "timeAttack" | "challenge";

export interface Platform {
  id: number;
  floor: number;
  x: number;
  y: number;
  width: number;
  type: PlatformType;
}

export interface ComboState {
  active: boolean;
  lastFloorTouched: number;
  currentComboFloorsSkipped: number;
  comboTimer: number;
  multiplier: number;
}

export interface ScoreState {
  floorReached: number;
  totalScore: number;
  bestComboFloorsSkipped: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  currentFloor: number;
}

export interface ChallengeDefinition {
  id: string;
  name: string;
  description: string;
  targetFloor?: number;
  targetScore?: number;
  targetComboFloorsSkipped?: number;
  timeLimitSeconds?: number;
}

export interface GameConfig {
  gravity: number;
  moveAcceleration: number;
  maxRunSpeed: number;
  frictionGround: number;
  frictionIce: number;
  frictionAir: number;
  jumpSpeedBase: number;
  jumpSpeedBonusFromRun: number;
  comboTimerDuration: number;
  risingFloorBaseSpeed: number;
  risingFloorSpeedIncreasePerFloor: number;
  platformBaseSpacing: number;
  platformSpacingIncreasePerFloor: number;
  platformBaseWidth: number;
  platformWidthDecreasePerFloor: number;
  worldWidth: number;
  worldHeight: number;

  mode: GameMode;
  timeLimitSeconds?: number;
  challenge?: ChallengeDefinition;
}

export interface GameState {
  player: PlayerState;
  platforms: Platform[];
  combo: ComboState;
  score: ScoreState;
  risingFloorY: number;
  risingFloorSpeed: number;
  highestGeneratedFloor: number;
  isGameOver: boolean;
  timeElapsed: number;
  mode: GameMode;
  modeCompleted: boolean;
  challenge?: ChallengeDefinition;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface GameSummary {
  mode: GameMode;
  floorReached: number;
  totalScore: number;
  bestComboFloorsSkipped: number;
  timeElapsed: number;
  modeCompleted: boolean;
  challengeId?: string;
}

export class IcyTowerEngine {
  public state: GameState;
  public config: GameConfig;

  private jumpPressedLastFrame = false;

  constructor(config?: Partial<GameConfig>) {
    // Micro-tuned arc:
    // - Gravity high but not brutal
    // - Jump base strong, bonus from run-up noticeable
    // - Feels like: short hops from standstill, big floaty arcs from full run
    this.config = {
      gravity: 2100,
      moveAcceleration: 3800,
      maxRunSpeed: 680,
      frictionGround: 2600,
      frictionIce: 900,
      frictionAir: 520,
      jumpSpeedBase: 840,
      jumpSpeedBonusFromRun: 340,
      comboTimerDuration: 1.15,
      risingFloorBaseSpeed: 95,
      risingFloorSpeedIncreasePerFloor: 0.18,
      platformBaseSpacing: 92,
      platformSpacingIncreasePerFloor: 0.46,
      platformBaseWidth: 230,
      platformWidthDecreasePerFloor: 0.45,
      worldWidth: 400,
      worldHeight: 600,
      mode: "classic",
      ...config,
    };

    this.state = this.createInitialState();
  }

  public setMode(mode: GameMode, overrides?: Partial<GameConfig>): void {
    this.config = {
      ...this.config,
      mode,
      ...overrides,
    };
    this.reset();
  }

  public setChallenge(challenge: ChallengeDefinition): void {
    this.config = {
      ...this.config,
      mode: "challenge",
      challenge,
      timeLimitSeconds: challenge.timeLimitSeconds,
    };
    this.reset();
  }

  private createInitialState(): GameState {
    const player: PlayerState = {
      x: this.config.worldWidth / 2,
      y: this.config.worldHeight - 80,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      onGround: false,
      currentFloor: 1,
    };

    const platforms: Platform[] = [
      {
        id: 1,
        floor: 1,
        x: this.config.worldWidth / 2 - this.config.platformBaseWidth / 2,
        y: this.config.worldHeight - 40,
        width: this.config.platformBaseWidth,
        type: "stone",
      },
    ];

    const combo: ComboState = {
      active: false,
      lastFloorTouched: 1,
      currentComboFloorsSkipped: 0,
      comboTimer: 0,
      multiplier: 1,
    };

    const score: ScoreState = {
      floorReached: 1,
      totalScore: 0,
      bestComboFloorsSkipped: 0,
    };

    return {
      player,
      platforms,
      combo,
      score,
      risingFloorY: this.config.worldHeight,
      risingFloorSpeed: this.config.risingFloorBaseSpeed,
      highestGeneratedFloor: 1,
      isGameOver: false,
      timeElapsed: 0,
      mode: this.config.mode,
      modeCompleted: false,
      challenge: this.config.challenge,
    };
  }

  public reset(): void {
    this.state = this.createInitialState();
    this.jumpPressedLastFrame = false;
  }

  public update(dt: number, input: InputState): void {
    if (this.state.isGameOver) return;

    this.state.timeElapsed += dt;

    if (this.config.mode === "timeAttack" && this.config.timeLimitSeconds) {
      if (this.state.timeElapsed >= this.config.timeLimitSeconds) {
        this.state.isGameOver = true;
        this.state.modeCompleted = true;
        return;
      }
    }

    if (
      this.config.mode === "challenge" &&
      this.config.challenge?.timeLimitSeconds
    ) {
      if (this.state.timeElapsed >= this.config.challenge.timeLimitSeconds) {
        this.state.isGameOver = true;
        // completion depends on targets; handled in checkChallengeCompletion
      }
    }

    this.updateRisingFloor(dt);
    this.updatePlayerPhysics(dt, input);
    this.handlePlatformCollisions();
    this.updateCombo(dt);
    this.updateScore();
    this.ensurePlatformsAhead();
    this.checkGameOver();
    this.checkChallengeCompletion();
  }

  private updateRisingFloor(dt: number): void {
    const floorFactor =
      this.state.score.floorReached *
      this.config.risingFloorSpeedIncreasePerFloor;

    let base = this.config.risingFloorBaseSpeed;
    if (this.config.mode === "timeAttack") base *= 1.3;

    this.state.risingFloorSpeed = base + floorFactor;
    this.state.risingFloorY -= this.state.risingFloorSpeed * dt;
  }

  private updatePlayerPhysics(dt: number, input: InputState): void {
    const p = this.state.player;

    let targetAccel = 0;
    if (input.left) targetAccel -= this.config.moveAcceleration;
    if (input.right) targetAccel += this.config.moveAcceleration;

    const currentPlatform = this.getPlatformUnderPlayer();
    const onIce = currentPlatform?.type === "ice";

    const friction = p.onGround
      ? onIce
        ? this.config.frictionIce
        : this.config.frictionGround
      : this.config.frictionAir;

    p.vx += targetAccel * dt;

    if (!input.left && !input.right) {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - friction * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + friction * dt);
    }

    if (p.vx > this.config.maxRunSpeed) p.vx = this.config.maxRunSpeed;
    if (p.vx < -this.config.maxRunSpeed) p.vx = -this.config.maxRunSpeed;

    const jumpPressedNow = input.jump;
    const jumpJustPressed = jumpPressedNow && !this.jumpPressedLastFrame;
    this.jumpPressedLastFrame = jumpPressedNow;

    if (jumpJustPressed && p.onGround) {
      const runFactor = Math.min(Math.abs(p.vx) / this.config.maxRunSpeed, 1.0);
      const bonus = runFactor * this.config.jumpSpeedBonusFromRun;
      p.vy = -(this.config.jumpSpeedBase + bonus);
      p.onGround = false;
    }

    p.vy += this.config.gravity * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < 0) p.x = 0;
    if (p.x + p.width > this.config.worldWidth)
      p.x = this.config.worldWidth - p.width;
  }

  private getPlatformUnderPlayer(): Platform | undefined {
    const p = this.state.player;
    const epsilon = 2;

    return this.state.platforms.find((plat) => {
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;
      const nearY = Math.abs(p.y + p.height - plat.y) <= epsilon;
      return withinX && nearY;
    });
  }

  private handlePlatformCollisions(): void {
    const p = this.state.player;
    let landedPlatform: Platform | undefined;

    for (const plat of this.state.platforms) {
      const wasAbove = p.y + p.height <= plat.y;
      const nowBelowOrOn = p.y + p.height >= plat.y;
      const withinX = p.x + p.width > plat.x && p.x < plat.x + plat.width;

      if (wasAbove && nowBelowOrOn && withinX && p.vy >= 0) {
        p.y = plat.y - p.height;
        p.vy = 0;
        p.onGround = true;
        landedPlatform = plat;
        break;
      }
    }

    if (!landedPlatform) {
      p.onGround = false;
      return;
    }

    const previousFloor = this.state.player.currentFloor;
    const newFloor = landedPlatform.floor;
    this.state.player.currentFloor = newFloor;

    if (newFloor > this.state.score.floorReached) {
      this.state.score.floorReached = newFloor;
    }

    const floorsSkipped = newFloor - previousFloor;
    if (floorsSkipped >= 2) {
      this.startOrExtendCombo(floorsSkipped, newFloor);
    } else {
      this.breakComboIfActive();
    }
  }

  private startOrExtendCombo(floorsSkipped: number, newFloor: number): void {
    const combo = this.state.combo;

    if (!combo.active) {
      combo.active = true;
      combo.currentComboFloorsSkipped = floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    } else {
      combo.currentComboFloorsSkipped += floorsSkipped;
      combo.lastFloorTouched = newFloor;
      combo.comboTimer = this.config.comboTimerDuration;
    }

    combo.multiplier = 1 + Math.floor(combo.currentComboFloorsSkipped / 3);

    if (
      combo.currentComboFloorsSkipped > this.state.score.bestComboFloorsSkipped
    ) {
      this.state.score.bestComboFloorsSkipped = combo.currentComboFloorsSkipped;
    }
  }

  private breakComboIfActive(): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    const bonus = combo.currentComboFloorsSkipped * 10 * combo.multiplier;
    this.state.score.totalScore += bonus;

    combo.active = false;
    combo.currentComboFloorsSkipped = 0;
    combo.comboTimer = 0;
    combo.multiplier = 1;
  }

  private updateCombo(dt: number): void {
    const combo = this.state.combo;
    if (!combo.active) return;

    combo.comboTimer -= dt;
    if (combo.comboTimer <= 0) {
      this.breakComboIfActive();
    }
  }

  private updateScore(): void {
    const baseFloorScore = this.state.score.floorReached * 5;
    this.state.score.totalScore = baseFloorScore;
  }

  private ensurePlatformsAhead(): void {
    const targetMaxFloor = this.state.score.floorReached + 30;

    while (this.state.highestGeneratedFloor < targetMaxFloor) {
      const nextFloor = this.state.highestGeneratedFloor + 1;
      const spacing =
        this.config.platformBaseSpacing +
        nextFloor * this.config.platformSpacingIncreasePerFloor;
      const width = Math.max(
        40,
        this.config.platformBaseWidth -
          nextFloor * this.config.platformWidthDecreasePerFloor,
      );

      const lastPlatform = this.state.platforms.find(
        (p) => p.floor === this.state.highestGeneratedFloor,
      );
      const baseY = lastPlatform
        ? lastPlatform.y
        : this.config.worldHeight - 40;
      const newY = baseY - spacing;

      const x = Math.random() * (this.config.worldWidth - width);

      const type: PlatformType =
        nextFloor < 50 ? "stone" : nextFloor < 150 ? "wood" : "ice";

      this.state.platforms.push({
        id: nextFloor,
        floor: nextFloor,
        x,
        y: newY,
        width,
        type,
      });

      this.state.highestGeneratedFloor = nextFloor;
    }

    this.state.platforms = this.state.platforms.filter(
      (p) => p.y > this.state.risingFloorY - 200,
    );
  }

  private checkGameOver(): void {
    const p = this.state.player;
    if (p.y > this.state.risingFloorY) {
      this.state.isGameOver = true;
    }
  }

  private checkChallengeCompletion(): void {
    if (this.config.mode !== "challenge" || !this.config.challenge) return;

    const c = this.config.challenge;

    const floorOk =
      c.targetFloor !== undefined &&
      this.state.score.floorReached >= c.targetFloor;
    const scoreOk =
      c.targetScore !== undefined &&
      this.state.score.totalScore >= c.targetScore;
    const comboOk =
      c.targetComboFloorsSkipped !== undefined &&
      this.state.score.bestComboFloorsSkipped >= c.targetComboFloorsSkipped;

    if (floorOk || scoreOk || comboOk) {
      this.state.modeCompleted = true;
      this.state.isGameOver = true;
    }
  }

  public getComboText(): string | null {
    const combo = this.state.combo;
    if (!combo.active) return null;

    const skipped = combo.currentComboFloorsSkipped;
    if (skipped >= 20) return "Amazing!";
    if (skipped >= 10) return "Excellent!";
    if (skipped >= 5) return "Super!";
    return null;
  }

  public getSummary(): GameSummary {
    return {
      mode: this.state.mode,
      floorReached: this.state.score.floorReached,
      totalScore: this.state.score.totalScore,
      bestComboFloorsSkipped: this.state.score.bestComboFloorsSkipped,
      timeElapsed: this.state.timeElapsed,
      modeCompleted: this.state.modeCompleted,
      challengeId: this.state.challenge?.id,
    };
  }
}
```

---

### 2. Devvit: data-driven challenges + leaderboard UI

#### Challenge definitions

```ts
// challenges.ts

import { ChallengeDefinition } from "./IcyTowerEngine";

export const CHALLENGES: ChallengeDefinition[] = [
  {
    id: "floor_100_sprint",
    name: "Floor 100 Sprint",
    description: "Reach floor 100 as fast as you can.",
    targetFloor: 100,
  },
  {
    id: "combo_20",
    name: "Combo Master 20",
    description: "Hit a 20-floor combo in a single run.",
    targetComboFloorsSkipped: 20,
  },
  {
    id: "score_5000_time_60",
    name: "Score Rush 5k",
    description: "Score 5000 points within 60 seconds.",
    targetScore: 5000,
    timeLimitSeconds: 60,
  },
];
```

#### Devvit integration with leaderboard UI

```ts
// IcyTowerDevvit.ts

import { Devvit } from "@devvit/public-api";
import {
  IcyTowerEngine,
  InputState,
  GameMode,
  GameSummary,
  ChallengeDefinition,
} from "./IcyTowerEngine";
import { CHALLENGES } from "./challenges";

interface PlayerProfile {
  id: string;
  name: string;
  totalFloors: number;
  bestFloor: number;
  totalScore: number;
  bestScore: number;
  totalCombos: number;
  longestCombo: number;
  totalPlaytimeSeconds: number;
  runsPlayed: number;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  mode: GameMode;
  bestFloor: number;
  bestScore: number;
}

const engine = new IcyTowerEngine();

let lastTimestamp = 0;
let inputState: InputState = { left: false, right: false, jump: false };
let currentMode: GameMode = "classic";
let currentChallenge: ChallengeDefinition | null = null;

async function loadProfile(context: any): Promise<PlayerProfile> {
  const user = await context.user.getCurrentUser();
  const userId = user.id;
  const userName = user.username ?? "Player";

  const stored =
    await context.userStorage.get<PlayerProfile>("icytower_profile");
  if (stored) return stored;

  const profile: PlayerProfile = {
    id: userId,
    name: userName,
    totalFloors: 0,
    bestFloor: 0,
    totalScore: 0,
    bestScore: 0,
    totalCombos: 0,
    longestCombo: 0,
    totalPlaytimeSeconds: 0,
    runsPlayed: 0,
  };
  await context.userStorage.set("icytower_profile", profile);
  return profile;
}

async function saveProfile(
  context: any,
  profile: PlayerProfile,
): Promise<void> {
  await context.userStorage.set("icytower_profile", profile);
}

async function updateProfileFromSummary(
  context: any,
  profile: PlayerProfile,
  summary: GameSummary,
): Promise<void> {
  profile.runsPlayed += 1;
  profile.totalFloors += summary.floorReached;
  profile.totalScore += summary.totalScore;
  profile.totalPlaytimeSeconds += summary.timeElapsed;

  if (summary.floorReached > profile.bestFloor)
    profile.bestFloor = summary.floorReached;
  if (summary.totalScore > profile.bestScore)
    profile.bestScore = summary.totalScore;
  if (summary.bestComboFloorsSkipped > profile.longestCombo)
    profile.longestCombo = summary.bestComboFloorsSkipped;

  profile.totalCombos += summary.bestComboFloorsSkipped;

  await saveProfile(context, profile);
}

async function updateLeaderboard(
  context: any,
  summary: GameSummary,
  profile: PlayerProfile,
): Promise<void> {
  const key = `icytower_leaderboard_${summary.mode}`;
  const list = (await context.kvStore.get<LeaderboardEntry[]>(key)) ?? [];

  const existingIndex = list.findIndex((e) => e.userId === profile.id);

  const entry: LeaderboardEntry = {
    userId: profile.id,
    userName: profile.name,
    mode: summary.mode,
    bestFloor: summary.floorReached,
    bestScore: summary.totalScore,
  };

  if (existingIndex >= 0) {
    const prev = list[existingIndex];
    entry.bestFloor = Math.max(prev.bestFloor, entry.bestFloor);
    entry.bestScore = Math.max(prev.bestScore, entry.bestScore);
    list[existingIndex] = entry;
  } else {
    list.push(entry);
  }

  list.sort((a, b) => b.bestScore - a.bestScore);
  const trimmed = list.slice(0, 50);

  await context.kvStore.set(key, trimmed);
}

async function loadLeaderboard(
  context: any,
  mode: GameMode,
): Promise<LeaderboardEntry[]> {
  const key = `icytower_leaderboard_${mode}`;
  return (await context.kvStore.get<LeaderboardEntry[]>(key)) ?? [];
}

Devvit.addCustomPostType({
  name: "Icy Tower",
  description: "Climb, combo, and compete on leaderboards.",
  render: (context) => {
    const { ui } = context;

    const profilePromise = loadProfile(context);

    const modeSelector = ui.hstack({
      spacing: 8,
      children: [
        ui.button({
          label: "Classic",
          onPress: () => {
            currentMode = "classic";
            currentChallenge = null;
            engine.setMode("classic");
          },
        }),
        ui.button({
          label: "Time Attack",
          onPress: () => {
            currentMode = "timeAttack";
            currentChallenge = null;
            engine.setMode("timeAttack", { timeLimitSeconds: 60 });
          },
        }),
        ui.button({
          label: "Challenge",
          onPress: () => {
            currentMode = "challenge";
            currentChallenge = CHALLENGES[0];
            engine.setChallenge(CHALLENGES[0]);
          },
        }),
      ],
    });

    const challengeSelector = ui.vstack({
      spacing: 4,
      children: CHALLENGES.map((c) =>
        ui.button({
          label: c.name,
          onPress: () => {
            currentMode = "challenge";
            currentChallenge = c;
            engine.setChallenge(c);
          },
        }),
      ),
    });

    ui.onKeyDown((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = true;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = true;
          break;
        case "KeyR":
          if (engine.state.isGameOver) engine.reset();
          break;
      }
    });

    ui.onKeyUp((event) => {
      switch (event.key) {
        case "ArrowLeft":
        case "KeyA":
          inputState.left = false;
          break;
        case "ArrowRight":
        case "KeyD":
          inputState.right = false;
          break;
        case "Space":
        case "ArrowUp":
        case "KeyW":
          inputState.jump = false;
          break;
      }
    });

    ui.onAnimationFrame(async (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dtMs = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      const dt = dtMs / 1000;
      engine.update(dt, inputState);

      const state = engine.state;

      if (state.isGameOver) {
        const summary = engine.getSummary();
        const profile = await profilePromise;
        await updateProfileFromSummary(context, profile, summary);
        await updateLeaderboard(context, summary, profile);
      }

      const leaderboard = await loadLeaderboard(context, currentMode);
      const profile = await profilePromise;

      ui.draw((canvas) => {
        canvas.clear("#00111f");

        canvas.fillStyle = "#223344";
        canvas.fillRect(0, state.risingFloorY, engine.config.worldWidth, 10);

        for (const plat of state.platforms) {
          switch (plat.type) {
            case "stone":
              canvas.fillStyle = "#777777";
              break;
            case "wood":
              canvas.fillStyle = "#aa7744";
              break;
            case "ice":
              canvas.fillStyle = "#66ccff";
              break;
          }
          canvas.fillRect(plat.x, plat.y, plat.width, 8);
        }

        canvas.fillStyle = "#ffdd33";
        canvas.fillRect(
          state.player.x,
          state.player.y,
          state.player.width,
          state.player.height,
        );

        canvas.fillStyle = "#ffffff";
        canvas.font = "14px sans-serif";
        canvas.fillText(`Mode: ${currentMode}`, 10, 20);
        canvas.fillText(`Floor: ${state.score.floorReached}`, 10, 38);
        canvas.fillText(`Score: ${Math.floor(state.score.totalScore)}`, 10, 56);

        if (currentChallenge) {
          canvas.fillText(`Challenge: ${currentChallenge.name}`, 10, 74);
        }

        if (state.combo.active) {
          const comboText = engine.getComboText();
          const ratio =
            state.combo.comboTimer / engine.config.comboTimerDuration;

          canvas.fillStyle = "#ff66aa";
          canvas.fillRect(10, 92, 120 * ratio, 8);

          if (comboText) {
            canvas.fillStyle = "#ffffff";
            canvas.fillText(comboText, 10, 112);
          }
        }

        if (state.isGameOver) {
          canvas.fillStyle = "rgba(0,0,0,0.6)";
          canvas.fillRect(
            0,
            0,
            engine.config.worldWidth,
            engine.config.worldHeight,
          );
          canvas.fillStyle = "#ffffff";
          canvas.font = "22px sans-serif";
          canvas.fillText("Game Over", 120, 260);
          canvas.font = "14px sans-serif";
          canvas.fillText(`Floor: ${state.score.floorReached}`, 130, 282);
          canvas.fillText(
            `Score: ${Math.floor(state.score.totalScore)}`,
            130,
            300,
          );
          canvas.fillText("Press R to restart", 110, 320);
        }

        // Leaderboard UI (right side)
        canvas.fillStyle = "#ffffff";
        canvas.font = "14px sans-serif";
        canvas.fillText("Leaderboard", 260, 20);

        const top = leaderboard.slice(0, 10);
        let y = 40;
        top.forEach((entry, index) => {
          const isCurrent = entry.userId === profile.id;
          canvas.fillStyle = isCurrent ? "#ffdd33" : "#cccccc";
          canvas.fillText(
            `${index + 1}. ${entry.userName} - ${entry.bestScore}`,
            260,
            y,
          );
          y += 16;
        });
      });
    });

    const canvasRoot = ui.canvas({
      width: engine.config.worldWidth,
      height: engine.config.worldHeight,
    });

    return ui.vstack({
      spacing: 8,
      children: [modeSelector, challengeSelector, canvasRoot],
    });
  },
});
```

---

If you want to really nail the feel, next step is: you play a few runs, tell me “jumps feel too floaty / too short / too slippery,” and we tweak the constants together until Harold matches your muscle memory.
