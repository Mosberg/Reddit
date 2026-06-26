# The Everclimb – Devvit Web Game README

A fast‑paced vertical platformer built for Reddit using **Devvit Web**, **React**, **Hono**, and **Devvit Storage**.  
Players climb an infinite tower, chain combos, and fight against a rising void — all rendered inside a Reddit post or community page.

---

# 1. Tech Stack

- **Frontend:** React 19 (Devvit WebView), Tailwind CSS 4, Vite
- **Backend:** Devvit Serverless Runtime (Node 22), Hono, tRPC v11
- **Storage:** Devvit key‑value storage (profiles, stats, leaderboards)
- **Communication:** tRPC for typed client ↔ server calls
- **Deployment:** Devvit CLI (`npm run dev`, `npm run deploy`, `npm run launch`)

---

# 2. Project Structure

```
/src
  /client
    App.tsx
    GameCanvas.tsx
    HUD.tsx
    Leaderboard.tsx
    CharacterSelect.tsx
    assets/
  /server
    index.ts        # Hono app
    trpc.ts         # tRPC router
    storage.ts      # Profiles, stats, leaderboards
  /shared
    types.ts        # Shared game types
    physics.ts      # Jump arcs, gravity, momentum
    mechanics.ts    # Combos, scoring, rising floor
```

---

# 3. Game Overview

- **Title:** The Everclimb
- **Genre:** Arcade, vertical platformer
- **Main Character:** Rex “Rocketfeet” Rafter
- **Core Loop:**  
  Climb endlessly upward while the rising floor hunts you. Build momentum, chain jumps, and perform stylish combos to reach higher floors.
- **Objective:**  
  Reach the highest floor possible and stack massive combo chains before the rising void ends your run.

---

# 4. Lore

## The Skybound Spiral

A colossal tower that pierces the stratosphere. Every decade it emits a **Rising Pulse**, dissolving the ground below and forcing climbers upward.

## Rex “Rocketfeet” Rafter

A stunt climber from the Under‑Spire slums who discovered prototype **Rocketfeet Boots** and now enters the Spiral Trials to prove he can reach the sky.

---

# 5. Characters

### Playable

- **Rex Rafter** — momentum‑based stunt climber
- **Vexa Voltstride** — magnetic‑boot courier
- **Tomo Flipwick** — circus acrobat
- **Juno Skylark** — sky‑pirate with grappling gauntlet
- **Brick Boulderback** — heavyweight momentum‑slammer
- **Mira Nimbus** — cloud‑mage with air‑burst jumps

### Devvit Implementation

- Characters are **cosmetic only**
- Stored in: `storage.get("profiles")`
- Selected via: `<CharacterSelect />` component

---

# 6. Core Gameplay Mechanics

## Movement

- Left / Right movement
- Vertical jump
- Run‑up momentum
- Limited mid‑air control
- One‑way platforms

## Platform Behavior

- Infinite tower
- Increasing spacing
- Decreasing platform width
- Themed platform types (stone, ice, wood)
- Friction differences

## Rising Floor

- Constant upward scroll
- Accelerates over time
- Falling below = game over

---

# 7. Physics (Shared Module)

Implemented in `/src/shared/physics.ts`:

- Fixed gravity
- Momentum‑based horizontal speed
- Variable jump height
- Precision landing detection
- Edge‑jump tolerance
- Speed‑based jump amplification

---

# 8. Scoring & Combos

Implemented in `/src/shared/mechanics.ts`:

### Scoring

- Floor height
- Floors skipped
- Combo multipliers

### Combo System

- Start: skip 2+ floors
- Timer‑based
- Maintain by skipping more floors
- Break on landing or timeout
- Visual & audio feedback

---

# 9. Game Modes

### Classic Mode

Endless climb with normal physics.

### Challenge Mode

- Floor targets
- Combo targets
- Score targets

### Time Attack

- Fixed time
- Faster rising floor

### Practice Mode

- No scoring
- Instant restarts

---

# 10. Devvit Storage Integration

### Profiles

```
profiles/{userId} → {
  selectedCharacter,
  bestFloor,
  bestCombo,
  totalFloors,
  totalCombos,
  playtime
}
```

### Leaderboards

```
leaderboard/classic → top 10
leaderboard/timeattack → top 10
leaderboard/challenges → per‑challenge top 10
```

### Stats

Automatically updated after each run.

---

# 11. UI & Components

### GameCanvas

- Renders platforms, character, rising floor
- Handles physics tick
- Emits events to HUD

### HUD

- Floor counter
- Score
- Combo meter
- Rising floor indicator

### Leaderboard

- Fetches via tRPC
- Highlights current player
- Displays top 10 per mode

### CharacterSelect

- Shows all characters
- Saves selection to profile

---

# 12. Server (Hono + tRPC)

### Endpoints

- `profile.get`
- `profile.update`
- `leaderboard.submit`
- `leaderboard.top`
- `stats.increment`

### Example

```ts
router.profile.get = t.procedure
  .input(z.string())
  .query(async ({ input, ctx }) => {
    return ctx.storage.get(`profiles/${input}`);
  });
```

---

# 13. Deployment

### Development

```
npm run dev
```

### Build

```
npm run build
```

### Deploy to Reddit

```
npm run deploy
```

### Submit for Review

```
npm run launch
```

---

# 14. Summary

**The Everclimb** is a momentum‑driven vertical platformer built for Reddit’s Devvit platform.  
It combines tight physics, expressive movement, and competitive leaderboards — all running inside a Reddit post.

---

# 15. Author

Mosberg
