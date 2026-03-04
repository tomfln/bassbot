# BassBot Web Platform — Implementation Plan

## Feature Checklist

Every feature requested, tracked to completion.

### Landing & Public Pages
- [ ] Public landing page on `/` presenting the bot and its capabilities
- [ ] "Add to Discord" button (OAuth invite link via `DISCORD_INVITE_URL` env var)
- [ ] "Self-host" button linking to the GitHub repository
- [ ] "Dashboard" / "Login" button → `/login` or `/guilds` if logged in

### Authentication
- [ ] BetterAuth with Discord OAuth provider (no other login methods)
- [ ] Discord `guilds` scope to get user's guild list
- [ ] Login page (`/login`) with "Sign in with Discord" button
- [ ] Redirect to `/guilds` after login (or `/admin` if admin)
- [ ] User indicator in sidebar (avatar, name, sign-out)
- [ ] Signup controllable via admin control panel (toggle to disable signups)
- [ ] BetterAuth mounted in Elysia at `/rest/auth/*`

### Shared JWT
- [ ] Shared `JWT_SECRET` env var between bot and web containers
- [ ] Web backend issues JWT after login containing `{ sub, discordId, role, name, avatar, exp }`
- [ ] Bot API validates JWT from `Authorization: Bearer` header
- [ ] Both Elysia backends share auth validation logic

### Admin Dashboard (moved to `/admin`)
- [ ] Move current `/` (overview) → `/admin`
- [ ] Move `/guilds` → `/admin/guilds`
- [ ] Move `/guilds/[guildId]` → `/admin/guilds/[guildId]`
- [ ] Move `/players` → `/admin/players`
- [ ] Move `/players/[guildId]` → `/admin/players/[guildId]`
- [ ] Move `/logs` → `/admin/logs`
- [ ] Move `/control` → `/admin/control`
- [ ] Admin layout: check auth, redirect to `/login` if not logged in
- [ ] Show permission error if logged in but not admin
- [ ] Admin sidebar: user indicator + sign-out button

### Admin: User Management
- [ ] New `/admin/users` page (sidebar tab)
- [ ] List all users (role, ban status, created date, Discord name)
- [ ] Set role, ban/unban, delete user actions
- [ ] Signup enable/disable toggle in `/admin/control`

### User Player UI (`/guilds/*`)
- [ ] `/guilds` — user's guild list (guilds where user AND bot are both present)
- [ ] Guilds with active player show player card
- [ ] Guilds without bot show "Add Bot" button (invite link scoped to guild)
- [ ] `/guilds/[guildId]` — player detail view (no node stats, no logs, no admin actions)
- [ ] Neon green themed control bar below now-playing card:
  - [ ] Previous button
  - [ ] Play/Pause button
  - [ ] Next button
  - [ ] Loop mode toggle (off → track → queue)
  - [ ] Seek slider
  - [ ] Volume slider
- [ ] Queue controls:
  - [ ] Remove a song from queue
  - [ ] Play a song as next (move to position 0)
  - [ ] Shuffle button
  - [ ] Add songs (search input → bot search endpoint)
  - [ ] Drag-and-drop reordering

### Bot API: New User Endpoints (JWT-protected)
- [ ] `POST /api/players/:guildId/pause` — toggle pause
- [ ] `POST /api/players/:guildId/skip` — skip to next
- [ ] `POST /api/players/:guildId/prev` — go to previous
- [ ] `POST /api/players/:guildId/loop` — cycle loop mode `{ mode }`
- [ ] `POST /api/players/:guildId/shuffle` — shuffle queue
- [ ] `POST /api/players/:guildId/queue/add` — add song `{ query }`
- [ ] `POST /api/players/:guildId/queue/remove` — remove by index `{ index }`
- [ ] `POST /api/players/:guildId/queue/move` — move track `{ from, to }`
- [ ] `GET /api/players/:guildId/search` — search songs `?q=...`
- [ ] `POST /api/players/:guildId/seek` — seek to position `{ position }`
- [ ] `POST /api/players/:guildId/volume` — set volume `{ volume }`

### Permission System
- [ ] JWT middleware on bot: verify token, extract user
- [ ] Voice channel check: user must be in the same VC as the bot to control player
- [ ] Admin role bypasses VC check
- [ ] Existing admin-only endpoints (destroy player, clear queue, leave guild, settings) require admin role

### Shared Components
- [ ] Player detail view: shared component with `mode: "admin" | "user"` prop
- [ ] Admin mode: node stats, logs tab, destroy/clear actions
- [ ] User mode: control bar, queue controls, no admin actions
- [ ] User shell/sidebar: simpler nav (My Guilds), user info, sign-out, admin link if admin
- [ ] Admin shell: current sidebar + user indicator + sign-out

### Web Backend (Elysia in Next.js)
- [ ] Elysia instance mounted via Next.js catch-all at `/rest/[...path]/route.ts`
- [ ] Drizzle + SQLite database for web (`DATABASE_PATH` env var, default `/data/web.db`)
- [ ] BetterAuth tables (user, session, account, verification) + custom fields
- [ ] `/rest/jwt` — issue JWT after BetterAuth login
- [ ] `/rest/me` — return current user info
- [ ] `/rest/my-guilds` — user's Discord guilds intersected with bot guilds
- [ ] `/rest/admin/users` — user CRUD (admin only)
- [ ] `/rest/admin/settings` — signup toggle

### Infrastructure
- [ ] `JWT_SECRET` env var on both bot and web containers in compose.yml
- [ ] `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` env vars for web
- [ ] `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` env vars for web
- [ ] `DISCORD_INVITE_URL` env var for web
- [ ] `DATABASE_PATH` env var for web (default `/data/web.db`)
- [ ] `./web-data:/data` volume mapping for web service in compose.yml
- [ ] Web Dockerfile: ensure SQLite works in standalone build
- [ ] Web drizzle migrations

### Bug Fixes (from TODO.md)
- [ ] Fix logs "show more" refresh bug
- [ ] Add API endpoint to fetch logs only after a certain timestamp or logId

---

## Architecture

```
Browser ──→ Reverse Proxy
              ├── /rest/*  ──→ Next.js (Elysia catch-all)
              │     ├── /rest/auth/*     ─ BetterAuth (Discord OAuth)
              │     ├── /rest/jwt        ─ Issue JWT
              │     ├── /rest/me         ─ Current user
              │     ├── /rest/my-guilds  ─ User's mutual guilds
              │     └── /rest/admin/*    ─ Admin APIs
              ├── /api/*   ──→ Bot (Elysia, existing + new endpoints)
              │     ├── /api/stats, /api/players, /api/ws, etc.
              │     └── JWT middleware for auth
              └── /*       ──→ Next.js (pages)
                    ├── /              ─ Landing page (public)
                    ├── /login         ─ Discord OAuth
                    ├── /guilds/*      ─ User player views
                    └── /admin/*       ─ Admin dashboard
```

## Environment Variables (New)

| Variable | Service | Description |
|---|---|---|
| `JWT_SECRET` | bot + web | Shared secret for JWT signing/verification |
| `BETTER_AUTH_SECRET` | web | BetterAuth encryption key (≥32 chars) |
| `BETTER_AUTH_URL` | web | Base URL of the web app |
| `DISCORD_CLIENT_ID` | web | Discord OAuth app client ID |
| `DISCORD_CLIENT_SECRET` | web | Discord OAuth app secret |
| `DISCORD_INVITE_URL` | web | Bot OAuth2 invite link |
| `DATABASE_PATH` | web | SQLite DB path (default `/data/web.db`) |

## Implementation Order

1. Phase 1: Foundation (deps, DB, BetterAuth, Elysia server, JWT, auth client)
2. Phase 2: Route restructuring (move pages to `/admin/*`)
3. Phase 3: Public pages (landing, login, layout restructuring)
4. Phase 4: Admin user management
5. Phase 5: Bot API user endpoints + permission middleware
6. Phase 6: User player UI (guild list, player view, control bar, queue controls)
7. Phase 7: Shared components + polish
8. Phase 8: Infrastructure (Docker, compose, CI)
