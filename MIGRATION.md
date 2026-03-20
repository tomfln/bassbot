# Turborepo Migration Plan

## Current structure

```
bassbot/                          ← root (bun workspace)
├── package.json                  ← bot deps + scripts
├── tsconfig.json                 ← bot + lib type-checking
├── eslint.config.ts              ← bot + lib ESLint
├── prettier.config.js            ← shared prettier config
├── drizzle.config.ts             ← bot drizzle config
├── bunfig.toml
├── bun.lock                      ← single lockfile
├── lib/                          ← shared library (@lib/*)
│   ├── index.ts                  ← barrel export
│   ├── *.ts                      ← command framework, jwt, logger, etc.
│   ├── command/                  ← sub-module
│   ├── scripts/                  ← CLI scripts (dev, generate, register, etc.)
│   └── __tests__/                ← lib tests
├── src/                          ← bot app (@bot/*)
│   ├── index.ts                  ← entry point
│   ├── config.ts, bot.ts, player.ts, queue.ts
│   ├── api/                      ← Elysia REST API
│   ├── commands/                 ← slash commands
│   ├── events/                   ← lavalink events
│   ├── middlewares/               
│   ├── modals/
│   ├── util/                     ← db, helpers, schema
│   ├── validators/
│   └── constants/
├── web/                          ← dashboard app (@web/*)
│   ├── package.json              ← web deps 
│   ├── tsconfig.json             ← web type-checking
│   ├── eslint.config.mjs         ← web ESLint (next)
│   ├── drizzle.config.ts
│   ├── next.config.ts
│   ├── postcss.config.mjs
│   ├── components.json           ← shadcn
│   └── src/                      ← Next.js app
├── drizzle/                      ← bot migrations
├── config/                       ← deployment configs
└── docker/                       ← Dockerfiles
```

## Target structure

```
bassbot/                          ← turborepo root
├── turbo.json                    ← pipeline config
├── package.json                  ← root workspaces + top-level scripts
├── bunfig.toml
├── bun.lock                      ← single lockfile
├── apps/
│   ├── bot/                      ← bot app (@bot/*)
│   │   ├── package.json          ← "name": "@bassbot/bot"
│   │   ├── tsconfig.json         ← @bot/* → ./src/*
│   │   ├── eslint.config.ts
│   │   ├── drizzle.config.ts
│   │   ├── drizzle/              ← bot migrations
│   │   └── src/                  ← current src/ contents
│   │       ├── index.ts
│   │       ├── config.ts, bot.ts, player.ts, queue.ts
│   │       ├── api/, commands/, events/, middlewares/, …
│   │       └── ...
│   └── web/                      ← web dashboard (@web/*)
│       ├── package.json          ← "name": "@bassbot/web"
│       ├── tsconfig.json         ← @web/* → ./src/*
│       ├── eslint.config.mjs
│       ├── drizzle.config.ts
│       ├── drizzle/              ← web migrations (if any)
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       ├── components.json
│       └── src/                  ← current web/src/ contents
├── packages/
│   ├── lib/                      ← shared library (@bassbot/lib, alias @lib/*)
│   │   ├── package.json          ← "name": "@bassbot/lib"
│   │   ├── tsconfig.json         ← @lib/* → ./src/*
│   │   └── src/                  ← current lib/ contents (moved from lib/*.ts)
│   │       ├── index.ts
│   │       ├── command/, jwt.ts, logger.ts, ...
│   │       ├── scripts/          ← generate, register, etc.
│   │       └── __tests__/
│   └── config/                   ← shared configs (@bassbot/config)
│       ├── package.json          ← "name": "@bassbot/config"
│       ├── prettier.config.js
│       └── eslint-base.ts        ← shared ESLint base config (optional)
├── config/                       ← deployment configs (compose, .env example)
└── docker/                       ← Dockerfiles
```

## Cross-dependency map

### Current imports across boundaries

| From | To | Import | Type | Count |
|------|----|--------|------|-------|
| `src/` (bot) | `lib/` | `@lib/*` | runtime | ~61 imports across ~30 files |
| `web/src/` | `lib/` | `@lib/init-env`, `@lib/jwt` | runtime | 3 files |
| `web/src/` | `src/` (bot) | `@bot/api` | **type-only** | 1 file (`api-client.ts`) |
| `lib/scripts/register-commands.ts` | `src/` (bot) | `@bot/config` | runtime (CLI script) | 1 file |
| `lib/scripts/generate-commands-json.ts` | `src/` (bot) | path resolution (`../../src/commands`) | runtime (CLI script) | 1 file |
| `lib/scripts/generate.ts` | `src/` (bot) | writes to `src/commands/`, `src/validators/`, `src/middlewares/` | filesystem | 1 file |
| `lib/scripts/dev.ts` | both | spawns processes in root + `web/` | subprocess | 1 file |

### How each cross-dependency is handled in turborepo

1. **`src/` → `@lib/*`** (61 imports) — `@bassbot/bot` declares `@bassbot/lib` as a workspace dependency. `@bot/*` → `./src/*` stays local; `@lib/*` → resolved via package dep + tsconfig `paths` pointing into `../../packages/lib/src/*`.

2. **`web/src/` → `@lib/*`** (3 imports) — Same approach: `@bassbot/web` declares `@bassbot/lib` as a workspace dependency.

3. **`web/src/` → `@bot/api`** (1 type-only import) — This is the only cross-app dependency. Since it's type-only, `@bassbot/web` declares `@bassbot/bot` as a **dev dependency** and the tsconfig `paths` maps `@bot/*` → `../../apps/bot/src/*`. No runtime cost.

4. **`lib/scripts/register-commands.ts` → `@bot/config`** — This script is bot-specific. **Move it to `apps/bot/`** so it naturally resolves `@bot/config`. It still imports `@lib/command` and `@lib/register` via the lib dependency.

5. **`lib/scripts/generate-commands-json.ts`** — Uses `../../src/commands` path. **Move to `apps/bot/`** since it reads bot commands. Update path to `../src/commands` and output to `../../apps/web/src/assets/commands.json`.

6. **`lib/scripts/generate.ts`** — Scaffolds files into `src/`. **Move to `apps/bot/`** so relative paths work naturally.

7. **`lib/scripts/dev.ts`** — Replaced by turborepo's `turbo dev` which runs both apps concurrently. **Delete.**

8. **`lib/scripts/docker-publish-check.ts`** — CI only, no cross-deps. Keep in root or move to `apps/bot/`.

9. **Template files** (`lib/scripts/templates/`) — Used by `generate.ts`. Move together to `apps/bot/scripts/templates/`.

## Migration steps

### Phase 1: Create turborepo scaffolding

1. Create `turbo.json` with pipeline definitions
2. Create `apps/bot/package.json`, `apps/web/package.json`, `packages/lib/package.json`, `packages/config/package.json`
3. Update root `package.json` to define workspaces as `["apps/*", "packages/*"]`

### Phase 2: Move files

4. Move `lib/*.ts`, `lib/command/`, `lib/__tests__/` → `packages/lib/src/`
5. Move `lib/scripts/register-commands.ts`, `lib/scripts/generate.ts`, `lib/scripts/generate-commands-json.ts`, `lib/scripts/templates/` → `apps/bot/scripts/`
6. Move `lib/scripts/docker-publish-check.ts` → root `scripts/` or `apps/bot/scripts/`
7. Move `src/` → `apps/bot/src/`
8. Move `drizzle/` → `apps/bot/drizzle/`, `drizzle.config.ts` → `apps/bot/`
9. Move `eslint.config.ts` → `apps/bot/`
10. Move `web/` → `apps/web/` (the entire directory including its own package.json, tsconfig, etc.)
11. Move `prettier.config.js` → `packages/config/prettier.config.js`
12. Delete `lib/scripts/dev.ts` (replaced by turborepo)

### Phase 3: Update configs

13. Create `packages/lib/tsconfig.json` — `@lib/*` → `./src/*`
14. Create `apps/bot/tsconfig.json` — `@bot/*` → `./src/*`, inherits deps on `@lib/*`
15. Update `apps/web/tsconfig.json` — keep `@web/*` → `./src/*`, update `@lib/*` and `@bot/*` paths
16. Update `apps/web/next.config.ts` — `outputFileTracingRoot` now points to monorepo root (`../../`)
17. Update `apps/web/components.json` — shadcn aliases stay on `@web/*` (unchanged)
18. Update all `drizzle.config.ts` paths
19. Update each app's `eslint.config.ts`

### Phase 4: Update package.json scripts

20. **`apps/bot/package.json`** scripts:
    - `"dev": "bun --watch src/index.ts"`
    - `"start": "bun run src/index.ts"`
    - `"lint": "tsc"`
    - `"eslint": "eslint ."`
    - `"register": "bun scripts/register-commands.ts"`
    - `"g": "bun scripts/generate.ts"`
    - `"gen:commands": "bun scripts/generate-commands-json.ts"`
    - `"db:generate": "drizzle-kit generate"`

21. **`apps/web/package.json`** scripts:
    - `"dev": "next dev"`
    - `"build": "next build"`
    - `"start": "next start"`
    - `"lint": "tsc"`
    - `"eslint": "eslint"`
    - remove `predev`/`prebuild` hooks (generate-commands-json moves to bot)

22. **Root `package.json`** scripts:
    - `"dev": "turbo dev"`
    - `"build": "turbo build"`
    - `"lint": "turbo lint"`
    - `"eslint": "turbo eslint"`
    - `"g": "turbo g --filter=@bassbot/bot"`
    - `"register": "turbo register --filter=@bassbot/bot"`
    - `"build-bot": "docker build -t bassbot:latest -f docker/Dockerfile.bot ."`
    - `"build-web": "docker build -t bassbot:latest -f docker/Dockerfile.web ."`

### Phase 5: Update import paths

23. **Bot scripts** (moved from `lib/scripts/` to `apps/bot/scripts/`):
    - `register-commands.ts`: `@bot/config` stays (now resolves within same app). Update `import.meta.dir`-relative paths for command directory.
    - `generate-commands-json.ts`: Update `COMMANDS_DIR` and `OUTPUT_FILE` paths.
    - `generate.ts`: Update `TEMPLATE_DIR`, `COMMANDS_DIR` paths.

24. **Lib tests** (`packages/lib/src/__tests__/`):
    - `type-inference.test.ts`: change `@lib/command` → `../command`, `@lib/middleware` → `../middleware`, `@lib/validator` → `../validator` (now relative within package). Or keep `@lib/*` and set path alias in lib's tsconfig.

25. **Web config** (`apps/web/src/lib/config.ts`):
    - `dataDir` fallback path: `resolve(join(process.cwd(), "..", "data"))` → `resolve(join(process.cwd(), "data"))` or use `DATA_DIR` env.

### Phase 6: Update Dockerfiles

26. **`docker/Dockerfile.bot`** — Update COPY commands:
    ```dockerfile
    COPY package.json bun.lock ./
    COPY apps/bot/package.json apps/bot/
    COPY packages/lib/package.json packages/lib/
    COPY packages/config/package.json packages/config/
    RUN bun install --frozen-lockfile
    
    COPY packages/lib/ packages/lib/
    COPY apps/bot/ apps/bot/
    WORKDIR /app/apps/bot
    CMD ["bun", "start"]
    ```

27. **`docker/Dockerfile.web`** — Update COPY and build commands:
    ```dockerfile
    # deps stage copies all package.jsons
    # builder stage copies full repo, builds in apps/web
    # runner stage copies standalone output
    ```
    - `outputFileTracingRoot` now 2 levels up → standalone output mirrors monorepo layout

### Phase 7: Verify

28. Run `bun install` (regenerate lockfile for new workspace layout)
29. Run `turbo lint` — verify all type-checking passes
30. Run `turbo build` — verify web build succeeds
31. Run `bun test` in `packages/lib` — verify all lib tests pass
32. Test `bun g` from root (shorthand for bot generator)
33. Verify Docker builds: `docker build -f docker/Dockerfile.bot .` and `docker build -f docker/Dockerfile.web .`

## Risk areas

1. **`@bot/api` type-only import in web** — The web's Eden treaty client needs the bot's `App` type. This works because TypeScript can resolve it at build time through tsconfig paths. The web Dockerfile already copies the full repo for the build stage, so this continues to work.

2. **Next.js standalone output** — `outputFileTracingRoot` must point to the monorepo root (`path.join(__dirname, "../..")`) so that `packages/lib/` runtime imports are included in the standalone bundle.

3. **Lockfile** — Currently a single `bun.lock` at root. Turborepo with bun workspaces keeps this pattern — no change needed. `bun install` at root resolves all workspace packages.

4. **shadcn** — The `components.json` uses `@web/*` aliases. These are internal to the web app and stay unchanged.

5. **generate-commands-json** — This script reads bot commands and writes to web's assets. After the move, it lives in `apps/bot/scripts/` but writes to `../../apps/web/src/assets/commands.json`. Alternatively, make this a turbo task that runs as part of web's build pipeline. 

6. **Prettier** — `packages/config/prettier.config.js` is referenced by each app via `"prettier": "@bassbot/config/prettier"` in their package.json, or apps can have their own config that imports from it.
