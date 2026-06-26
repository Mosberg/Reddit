# Reddit Devvit Workspace

This workspace is a curated local collection of Reddit Devvit repositories and starter templates.
It includes:

- Platform source (`devvit-main`)
- Official docs site (`devvit-docs-main`)
- Multiple first-party templates for web apps, games, moderation tools, and payments

The repository root currently contains:

- `templates/` (all imported projects)
- `.git/`

## Goals Of This Workspace

- Provide a one-stop local reference for Devvit development patterns
- Compare template architectures and tooling choices
- Quickly bootstrap app prototypes by copying or cloning from known-good starters
- Keep docs and implementation examples available side-by-side

## Top-Level Structure

All project repositories are under `templates/`.

### Core Platform And Docs

1. `templates/devvit-main`

- Purpose: Open-source Devvit platform monorepo
- Tooling: Yarn workspaces + Turborepo
- Node requirement: `>=22.2.0`
- Notable scripts:
  - `yarn build`, `yarn build:all`
  - `yarn test`, `yarn test:all`
  - `yarn lint`, `yarn lint:all`
  - `yarn docs:*` generators/build commands
- Notes:
  - Main source for platform-level implementation details
  - Best reference for contribution process, bug reporting, and CLA guidance

2. `templates/devvit-docs-main`

- Purpose: Developer docs website
- Tooling: Docusaurus 3, React 19
- Package manager: Yarn (recommended by repo docs)
- Notable scripts:
  - `yarn start`
  - `yarn build`
  - `yarn deploy`
  - `yarn write-heading-ids`
- Notes:
  - Maintainers indicate changes should be kept in both `docs/` and `versioned_docs/`

### Templates: App Development Starters

3. `templates/devvit-template-react-main`

- Type: General-purpose web app starter
- Stack: React 19, Tailwind CSS 4, Vite, Hono, tRPC
- Node: `>=22.2.0`
- Config files: `devvit.json`, `devvit.yaml` (yaml file exists in this template)
- Best for: Typical Devvit web apps with modern UI and server logic

4. `templates/devvit-template-phaser-main`

- Type: 2D game starter
- Stack: Phaser + Vite + Hono + tRPC
- Node: `>=22.2.0`
- Best for: Browser-based 2D game loops, physics, sprite workflows

5. `templates/devvit-template-threejs-main`

- Type: 3D starter
- Stack: Three.js + Vite + Hono + tRPC
- Node: `>=22.2.0`
- Best for: 3D rendering and visualization experiences inside Devvit Web

6. `templates/devvit-template-unity-main`

- Type: Unity integration starter
- Stack: Unity WebGL assets + Vite + Hono + tRPC
- Node: `>=22.12.0`
- Best for: Teams shipping Unity-authored games into Devvit

7. `templates/devvit-template-gamemaker-main`

- Type: GameMaker integration starter
- Stack: GameMaker HTML/WASM export + Vite + Hono + tRPC
- Node: `>=22.2.0`
- Includes helper setup scripts:
  - `setup-gamemaker-devvit.bat`
  - `setup-gamemaker-devvit.sh`

8. `templates/devvit-template-vibe-coding-main`

- Type: Full-featured app starter with tests
- Stack: React 19, Tailwind CSS 4, Vite, Hono, tRPC, Vitest
- Node: `>=22.2.0`
- Unique traits:
  - Includes `vitest.config.ts`
  - Includes `npm run test`
  - Includes AI-oriented docs (`AGENTS.md`)

9. `templates/devvit-template-bare-main`

- Type: Minimal starter
- Stack: TypeScript + esbuild + Devvit
- Node: `>=22.6.0`
- Best for: Minimal footprint and direct control without React/Vite defaults

10. `templates/devvit-template-payments-main`

- Type: Payments example
- Stack: Devvit payments/public-api packages + TypeScript
- Config style: `devvit.yaml`
- Notes:
  - Package scripts are intentionally minimal/empty in current `package.json`
  - README emphasizes `devvit upload` + `devvit playtest`

### Templates: Moderation Tools

11. `templates/devvit-template-mod-tool-devvit-web-main`

- Type: Baseline moderation tool template
- Stack: Vite + Hono + Devvit Web
- Example feature: Comment/Post "Mop" menu actions
- `devvit.json` highlights:
  - Moderator menu endpoints
  - Forms
  - Install trigger
  - Reddit permission enabled

12. `templates/devvit-template-mod-tool-devvit-web-toolbox-main`

- Type: Extended moderation toolbox template
- Stack: Vite + Hono + Devvit Web
- Extra capabilities beyond baseline mod-tool template:
  - Additional triggers
  - Scheduler task (`weeklyMegathreadCheck`)
  - Subreddit settings schema
  - Redis + Reddit permissions
  - `build:watch`, `test`, and `test:unit` scripts

## Common Commands Across Most Templates

Most template repositories support these npm scripts:

- `npm run dev` - local playtest/watch cycle
- `npm run build` - production build
- `npm run deploy` - upload app version
- `npm run launch` - publish for review
- `npm run login` - authenticate Devvit CLI
- `npm run type-check` - static checks

Often available in web-heavy templates:

- `npm run lint`
- `npm run prettier`

Only observed in selected templates:

- `npm run test` (not universal; available in at least vibe-coding and mod-tool-toolbox)

## Shared Architecture Pattern (Web Templates)

Most modern templates follow this separation:

- `src/server` - Hono/tRPC backend in Devvit server runtime
- `src/client` - iframe frontend rendered on Reddit
- `src/shared` - shared types/logic

Frequent config pattern in `devvit.json`:

- `post.entrypoints.default` -> inline `splash.html`
- `post.entrypoints.game` -> expanded `game.html`
- `server.entry` -> compiled server bundle (commonly `index.cjs`)

## Important Constraints For Devvit Web

These constraints are repeated across template agent guidance and should be treated as workspace-wide defaults for Devvit Web apps:

- Do not use `window.location`/`window.assign`; prefer Devvit navigation helpers
- Do not use `window.alert`; prefer Devvit form/toast UX
- Geolocation/camera/microphone/notifications APIs are not available
- Keep inline entrypoints light; load heavy dependencies in expanded views
- If adding menu endpoints, update both server handlers and `devvit.json`
- Do not mix Devvit blocks APIs (`@devvit/public-api`) into web-only templates unless intentionally migrating architectures

## Node And Tooling Compatibility

Observed Node constraints across repositories:

- `>=22.2.0` (most repos)
- `>=22.6.0` (bare)
- `>=22.12.0` (unity)

Recommended local setup for this workspace:

1. Install Node 22 LTS/current and ensure it satisfies the highest minimum (`>=22.12.0` for all templates).
2. Keep both `npm` and `yarn` available.
3. Install Devvit CLI globally:
   - `npm install -g devvit`
4. Use `npm install` in individual template repos and `yarn` in `devvit-main`/`devvit-docs-main` where repo docs call for it.

## Suggested Daily Workflow

1. Pick a template closest to your use case.
2. Install dependencies in that repo.
3. Configure app metadata in `devvit.json` or `devvit.yaml`.
4. Run `npm run login` (if applicable) and `npm run dev`.
5. Validate type-check/lint before deploy.
6. Deploy and launch when ready.

## Folder-By-Folder Quick Matrix

| Repository                                         | Primary Use       | Build Tool  | App Runtime Style | Scripts Notability             |
| -------------------------------------------------- | ----------------- | ----------- | ----------------- | ------------------------------ |
| `devvit-main`                                      | Platform monorepo | Turborepo   | Multi-package     | extensive build/lint/test/docs |
| `devvit-docs-main`                                 | Docs site         | Docusaurus  | Static docs app   | docs build/deploy scripts      |
| `devvit-template-react-main`                       | General app       | Vite        | Web + server      | standard dev/deploy/lint       |
| `devvit-template-phaser-main`                      | 2D game           | Vite        | Web + server      | Phaser-focused starter         |
| `devvit-template-threejs-main`                     | 3D app/game       | Vite        | Web + server      | Three.js-focused starter       |
| `devvit-template-unity-main`                       | Unity bridge      | Vite        | Web + server      | higher Node min version        |
| `devvit-template-gamemaker-main`                   | GameMaker bridge  | Vite        | Web + server      | setup scripts for GM output    |
| `devvit-template-vibe-coding-main`                 | App + testing     | Vite        | Web + server      | includes Vitest                |
| `devvit-template-bare-main`                        | Minimal baseline  | esbuild     | lighter setup     | no Vite/React stack            |
| `devvit-template-payments-main`                    | Payments demo     | n/a/minimal | API-focused       | CLI-centric README             |
| `devvit-template-mod-tool-devvit-web-main`         | Mod tool baseline | Vite        | server-heavy      | Mop example + reddit perms     |
| `devvit-template-mod-tool-devvit-web-toolbox-main` | Mod tool advanced | Vite        | server-heavy      | scheduler/settings/redis       |

## Existing Internal Index

`templates/templates.md` already contains links and a short catalog of starter repos.
Use this root README as the detailed local operational reference.

## Recommended Starting Points

- New feature-rich app: `devvit-template-react-main`
- Game project from code: `devvit-template-phaser-main` or `devvit-template-threejs-main`
- Game project from existing engine export: `devvit-template-unity-main` or `devvit-template-gamemaker-main`
- Moderator tooling: `devvit-template-mod-tool-devvit-web-toolbox-main`
- Payments prototype: `devvit-template-payments-main`
- Minimal proof of concept: `devvit-template-bare-main`

## Source Validation

This README is based on a direct scan of repository READMEs, package manifests, config files, and agent guidance files present in this workspace as of 2026-06-26.
