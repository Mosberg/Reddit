# The Everclimb – Devvit Web Game README

A fast-paced vertical platformer built for Reddit using Devvit Web, React, Hono, and Devvit Storage.
Players climb an infinite tower, chain combos, and fight against a rising void - all rendered inside a Reddit post or community page.

---

# 1. Tech Stack

- Frontend: React 19 (Devvit WebView), Tailwind CSS 4, Vite
- Backend: Devvit Serverless Runtime (Node 22), Hono, tRPC v11
- Storage: Devvit key-value storage (profiles, stats, leaderboards)
- Communication: tRPC for typed client <-> server calls
- Deployment: Devvit CLI (`npm run dev`, `npm run deploy`, `npm run launch`)

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
    /lib
      trpcClient.ts
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

- Title: The Everclimb
- Genre: Arcade, vertical platformer
- Main Character: Rex "Rocketfeet" Rafter
- Core Loop:
  Climb endlessly upward while the rising floor hunts you. Build momentum, chain jumps, and perform stylish combos to reach higher floors.
- Objective:
  Reach the highest floor possible and stack massive combo chains before the rising void ends your run.

---

# 4. Game Modes

- Classic: Endless climb with normal physics and gradual rising-floor acceleration.
- Challenge: Reach a target floor against a faster pulse.
- Time Attack: Fixed run length with more pressure from the rising floor.
- Practice: No rising floor pressure for movement training.

---

# 5. Server Endpoints (tRPC)

- profile.get
- profile.update
- leaderboard.submit
- leaderboard.top
- stats.increment

---

# 6. Deployment

Development:

```
npm run dev
```

Build:

```
npm run build
```

Deploy to Reddit:

```
npm run deploy
```

Submit for Review:

```
npm run launch
```

---

# 7. Author

Mosberg
