# Reddit Devvit Game – Complete Feature & Mechanics Reference

# Game Overview

- **Title:** The Everclimb
- **Alternate Titles:**
  - Cloudstep Ascent
  - Tower of the Thousand Skies
  - Leapforge Infinity
  - Spiralbound Rush
  - Skybound Spiral

- **Genre:** Arcade, vertical platformer

- **Main Character:** Rex “Rocketfeet” Rafter
- **Alternate Characters:**
  - **Vexa Voltstride** — a neon‑punk courier with magnetic jump boots
  - **Tomo Flipwick** — a circus acrobat obsessed with impossible stunts
  - **Juno Skylark** — a sky‑pirate runaway with a grappling‑hook gauntlet
  - **Brick Boulderback** — a heavyweight climber who uses momentum slams
  - **Mira Nimbus** — a cloud‑mage who double‑jumps using air bursts

- **Core Loop:**  
  Keep climbing an endless tower of platforms while the rising floor threatens to swallow you. Maintain momentum, chain jumps, and perform stylish combos to reach higher floors.

- **Objective:**  
  Reach the highest floor possible and rack up massive combo chains before gravity (or the rising void) claims you.

---

# Lore

## The Spiral

The world is dominated by a colossal structure known as **The Skybound Spiral**, a tower so tall it pierces the stratosphere. Legends say that anyone who reaches its unseen summit earns a single wish — a power capable of reshaping the world.

Every decade, the tower awakens and emits a **Rising Pulse**, forcing climbers to ascend faster and faster as the ground below dissolves into shimmering light.

## Rex “Rocketfeet” Rafter — Lore

Rex grew up in the floating slums beneath the Spiral, watching elite climbers rise to fame. After discovering a pair of prototype **Rocketfeet Boots** — experimental momentum‑amplifying footwear — Rex enters the Spiral Trials to prove that even someone from the lowest rung can reach the sky.

---

# Character Sheet: Rex “Rocketfeet” Rafter

## Identity

- **Name:** Rex Rafter
- **Alias:** Rocketfeet
- **Age:** 19
- **Origin:** The Under‑Spire District
- **Role:** Momentum‑based stunt climber

## Appearance

- Spiky wind‑swept hair
- Lightweight jacket with aerodynamic fins
- Rocketfeet Boots glowing with kinetic charge
- Fingerless gloves for grip control

## Personality

- Energetic
- Reckless but clever
- Thrill‑seeker
- Loyal to underdogs
- Lives for “one more jump”

## Skills

- **Momentum Mastery:** Gains speed faster than other climbers
- **Turbo‑Stride:** Horizontal acceleration increases jump height
- **Aerial Drift:** Slight mid‑air steering
- **Combo Instinct:** Bonus score for stylish sequences

## Equipment

- **Rocketfeet Boots:** Stores kinetic energy and releases it as jump force
- **Wind‑Cutter Jacket:** Reduces air drag
- **Pulse Tracker:** Warns when the rising floor accelerates

## Tags

`stunt-climber`, `momentum-based`, `arcade-hero`, `vertical-platformer`, `combo-specialist`

---

# Logo Concept

**Logo Name:** _Skybound Spiral_

**Concept Description:**  
A sleek, upward‑twisting helix forming the silhouette of a tower. The helix is made of glowing platform segments, each slightly offset to imply motion. At the top, a small stylized figure (Rex) leaps upward with a streak of kinetic energy trailing behind. The typography is angular and ascending, with the “S” of _Skybound_ and _Spiral_ forming mirrored spirals.

**Color Palette:**

- Electric blue (momentum energy)
- Neon white (platform glow)
- Midnight navy (sky backdrop)
- Gradient gold (summit light)

**Style:**  
Arcade‑modern, energetic, slightly futuristic.

## 1. Game overview

- **Title:** Icy Tower
- **Genre:** Arcade, vertical platformer
- **Main character:** Harold the Homeboy
- **Core loop:** Keep climbing an endless tower of platforms while the screen (floor) rises. Falling off the bottom ends the run.
- **Objective:** Reach the highest floor and score as many points/combos as possible.

---

## 2. Core gameplay mechanics

### 2.1 Movement & controls

- **Left / Right:** Move Harold horizontally.
- **Jump:** Perform a vertical jump.
- **Run-up:** Holding a direction builds horizontal speed, which increases jump distance and height.
- **Mid-air control:** Limited horizontal adjustment while airborne.
- **One-way platforms:** Harold passes through platforms from below and lands on top.

### 2.2 Platform behavior

- **Endless tower:** Numbered floors from 1 upward; no fixed top.
- **Platform spacing:** Increases with height; gaps become larger and trickier.
- **Platform width:** Decreases as you climb, demanding more precision.
- **Platform types (visual themes):**
  - Stone floors (low levels)
  - Ice floors (slippery, low friction)
  - Wood floors
  - Other themed floors at higher levels
- **Friction differences:** Ice floors allow faster acceleration but harder stopping; stone/wood are more controllable.

### 2.3 Rising floor / time pressure

- **Scrolling bottom:** The lower boundary of the screen steadily rises.
- **Speed increase:** The scroll speed gradually accelerates as you climb.
- **Game over condition:** If Harold falls below the visible area (off the bottom), the run ends.

---

## 3. Physics & feel

### 3.1 Momentum-based movement

- **Speed buildup:** Horizontal speed increases the longer you run without stopping.
- **Big jumps:** Maximum horizontal speed at takeoff yields long, high jumps that can skip many floors.
- **Stopping:** Sudden direction changes or short taps reduce speed.

### 3.2 Jump arcs

- **Fixed gravity:** Consistent downward acceleration.
- **Variable jump height:** Depends on horizontal speed and timing.
- **Landing:** Precise landings on narrow platforms are required at higher floors.

---

## 4. Scoring, combos & feedback

### 4.1 Basic scoring

- **Floor score:** Points awarded based on the highest floor reached.
- **Jump score:** Extra points for skipping floors in a single jump.
- **Total score:** Combination of floor height and combo performance.

### 4.2 Combo system

- **Combo start:** Skip at least 2 floors in one jump (e.g., from floor 10 to 13).
- **Combo meter:** A short timer starts when a combo begins.
- **Maintaining combo:** Continue skipping floors before the timer runs out.
- **Combo break:** Landing on the immediate next floor without skipping or letting the timer expire ends the combo.
- **Combo tiers:** Larger combos trigger higher score multipliers and visual/audio effects.

### 4.3 Visual & audio feedback

- **On-screen text:** “Super!”, “Excellent!”, “Amazing!” for big combos.
- **Screen shake:** Strong combos cause camera shake for impact.
- **Sound effects:** Distinct jump, landing, combo, and game-over sounds.
- **Music:** Looping background tracks; sometimes different themes per tower section.

---

## 5. Game modes

_(Exact names vary by version, but these are the typical modes.)_

### 5.1 Classic mode

- **Description:** Standard endless climb with normal physics and rising floor.
- **Goal:** Reach the highest floor and score as much as possible.
- **Leaderboard:** High scores and best floors recorded.

### 5.2 Challenge / Mission modes

- **Floor challenges:** Reach a specific floor within a time or without falling.
- **Combo challenges:** Achieve a certain combo length or number of combos.
- **Score challenges:** Hit a target score in one run.

### 5.3 Time attack variants

- **Fixed time:** Climb as high as possible before time runs out.
- **Speed focus:** Faster rising floor, emphasizing aggressive combo play.

### 5.4 Practice mode

- **Free practice:** Experiment with jumps and combos without saving scores.
- **Restart quickly:** Instant restarts to train specific techniques.

---

## 6. Options & settings

### 6.1 Video & display

- **Resolution:** Select from available windowed resolutions.
- **Fullscreen toggle:** Switch between windowed and fullscreen.
- **V-sync / frame cap:** Fixed timestep (commonly 60 FPS) for consistent physics.
- **Detail level:** Optional toggles for visual effects (screen shake, particles).

### 6.2 Audio

- **Master volume:** Global sound level.
- **Music volume:** Adjust or mute background music.
- **Effects volume:** Adjust jump, combo, and UI sounds.
- **Mute all:** Single toggle to silence the game.

### 6.3 Controls

- **Key bindings:** Remap left, right, and jump keys.
- **Controller support:** Optional gamepad mapping (depending on version).
- **Sensitivity:** Fine-tune input responsiveness (if available).

### 6.4 Gameplay options

- **Screen shake toggle:** Enable/disable camera shake on big combos.
- **Combo text toggle:** Show/hide combo popups.
- **Tutorial hints:** Enable/disable on-screen tips for new players.
- **Ghost / replay visibility:** Show or hide ghost runs (if supported).

### 6.5 Profile & data

- **Player profiles:** Multiple user profiles with separate stats.
- **Statistics:** Total floors climbed, best floor, total combos, longest combo, total playtime.
- **Reset data:** Clear high scores and stats.

---

## 7. Characters & customization

### 7.1 Harold the Homeboy

- **Default avatar:** Classic hoodie-wearing character.
- **Movement style:** Standard physics and animations.

### 7.2 Alternate characters (versions with customization)

- **Unlockable skins:** Different outfits and characters with identical physics.
- **Cosmetic variations:** Color schemes, hats, accessories.
- **No pay-to-win:** Cosmetics do not affect gameplay mechanics.

---

## 8. Progression & meta

### 8.1 High score chasing

- **Local high scores:** Stored per profile.
- **Online leaderboards:** Compare floors and scores with global players (in some versions).
- **Replay sharing:** Upload or share replays (version-dependent).

### 8.2 Achievements

- **Floor milestones:** Reach floor 100, 500, 1000, etc.
- **Combo milestones:** Achieve combos of 10, 50, 100+.
- **Style achievements:** Perform specific trick jumps or sequences.
- **Consistency achievements:** Play X runs, total Y floors climbed.

---

## 9. UI & menus

### 9.1 Main menu

- **Start game:** Launch classic mode.
- **Modes:** Select challenge, time attack, or practice.
- **Options:** Access video, audio, controls, and gameplay settings.
- **Profiles:** Choose or create player profiles.
- **Exit:** Quit to desktop.

### 9.2 In-game HUD

- **Current floor:** Large display of floor number.
- **Score:** Current score and combo multiplier.
- **Combo meter:** Visual timer showing remaining combo time.
- **Rising floor indicator:** Subtle visual cue at the bottom.

### 9.3 Pause menu

- **Resume:** Continue the run.
- **Restart:** Start a new run immediately.
- **Options:** Adjust audio or controls mid-run.
- **Quit to menu:** End the run and return to main menu.

---

## 10. Game-over & replay

### 10.1 Game-over screen

- **Final floor:** Highest floor reached in the run.
- **Final score:** Total points and best combo.
- **New record notification:** Highlight if a new high score or floor record is achieved.
- **Retry prompt:** Quick restart option.

### 10.2 Replays (where supported)

- **Save replay:** Store the run for later viewing.
- **Replay browser:** List of saved runs with date, floor, and score.
- **Playback controls:** Play, pause, fast-forward, and restart replay.

---

## 11. Advanced techniques (player skill layer)

- **Speed-building runs:** Long horizontal runs before jumps to maximize distance.
- **Edge jumps:** Jumping at the very edge of platforms for optimal height.
- **Combo routing:** Planning sequences of platforms to maintain long combos.
- **Risk vs reward:** Balancing safe single-floor jumps against high-risk multi-floor skips.

---

## 12. Summary

Icy Tower is built around a simple idea—keep climbing—but layered with tight physics, momentum-based movement, a deep combo system, and escalating pressure from the rising floor. All options, modes, and settings exist to support that core: fast restarts, precise controls, clear feedback, and endless high-score chasing.

---

## 13. Author

Mosberg
