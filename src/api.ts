import { Elysia, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { verifyAuthHeader, verifyJwt, type JwtPayload } from "@lib/jwt"
import type { BassBot } from "./bot"
import type { PlayerWithQueue } from "./player"
import { LoadType, type Track } from "shoukaku"
import { getGlobalLog, getGuildLog } from "./util/activity-log"
import { cache } from "./util/api-cache"
import { addWsClient, removeWsClient } from "./util/broadcast"
import { resolveSong } from "./util/song-search"
import logger from "@lib/logger"
import config from "./config"
import { join } from "node:path"
import { readFileSync } from "node:fs"

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf-8")) as { version: string }

/* ── Cache TTLs (ms) ─────────────────────────────────────── */

const TTL = {
  STATS:        30_000,
  PLAYER_LIST:   5_000,
  PLAYER_DETAIL: 2_000,
  GUILD_LIST:   30_000,
  GUILD_DETAIL: 10_000,
  LOGS:          5_000,
} as const

/* ── Serializers ──────────────────────────────────────────── */

function trackInfo(t: { info: { title: string; author: string; uri?: string | null; artworkUrl?: string | null; length: number; sourceName?: string | null } }) {
  return {
    title: t.info.title,
    author: t.info.author,
    uri: t.info.uri ?? null,
    artworkUrl: t.info.artworkUrl ?? null,
    length: t.info.length,
  }
}

/** Minimal player info for list views — no queue/history arrays. */
function playerSummary(player: PlayerWithQueue, bot: BassBot) {
  const guild = bot.guilds.cache.get(player.guildId)
  const vc = guild?.members.me?.voice.channel

  return {
    guildId: player.guildId,
    guildName: guild?.name ?? "Unknown",
    guildIcon: guild?.iconURL({ size: 64 }) ?? null,
    paused: player.paused,
    position: player.position,
    current: player.current ? trackInfo(player.current) : null,
    queueLength: player.queue.length,
    voiceChannel: vc
      ? {
          name: vc.name,
          id: vc.id,
          memberCount: vc.members.filter((m) => !m.user.bot).size,
        }
      : null,
    node: player.node.name,
  }
}

/** Full player info for detail view — lists are truncated. */
function playerDetail(
  player: PlayerWithQueue,
  bot: BassBot,
  queueLimit: number,
  historyLimit: number,
) {
  const guild = bot.guilds.cache.get(player.guildId)
  const vc = guild?.members.me?.voice.channel

  return {
    guildId: player.guildId,
    guildName: guild?.name ?? "Unknown",
    guildIcon: guild?.iconURL({ size: 64 }) ?? null,
    paused: player.paused,
    position: player.position,
    current: player.current
      ? {
          ...trackInfo(player.current),
          sourceName: player.current.info.sourceName ?? null,
        }
      : null,
    queue: player.queue.slice(0, queueLimit).map(trackInfo),
    queueTotal: player.queue.length,
    history: player.history.slice(0, historyLimit).map(trackInfo),
    historyTotal: player.history.length,
    voiceChannel: vc
      ? {
          name: vc.name,
          id: vc.id,
          members: vc.members
            .filter((m) => !m.user.bot)
            .map((m) => ({
              id: m.id,
              displayName: m.displayName,
              avatar: m.user.displayAvatarURL({ size: 32 }),
            })),
        }
      : null,
    loopMode: player.loopMode,
    volume: player.userVolume,
    node: player.node.name,
    nodeStats: player.node.stats
      ? {
          players: player.node.stats.players,
          playingPlayers: player.node.stats.playingPlayers,
          uptime: player.node.stats.uptime,
          memory: player.node.stats.memory,
          cpu: player.node.stats.cpu,
          frameStats: player.node.stats.frameStats,
        }
      : null,
  }
}

/* ── Auth helpers ─────────────────────────────────────────── */

/** Error class for HTTP error responses (thrown from helpers, caught by onError). */
class HttpError extends Error {
  constructor(
    public statusCode: number,
    public body: Record<string, unknown>,
    public responseHeaders?: Record<string, string>,
  ) {
    super(typeof body.error === "string" ? body.error : "HTTP Error")
  }
}

/** Require any valid JWT. Returns the payload or throws a 401. */
async function requireAuth(request: Request): Promise<JwtPayload> {
  const user = await verifyAuthHeader(request.headers.get("authorization"), config.jwtSecret)
  if (!user) throw new HttpError(401, { error: "Unauthorized" })
  return user
}

/** Require JWT with admin role. Returns the payload or throws a 401/403. */
async function requireAdmin(request: Request): Promise<JwtPayload> {
  const user = await requireAuth(request)
  if (user.role !== "admin") throw new HttpError(403, { error: "Forbidden" })
  return user
}

/** Clamp and round a numeric query param to prevent cache key pollution. */
function clampParam(raw: string | undefined, fallback: number, max: number): number {
  const v = parseInt(raw ?? String(fallback)) || fallback
  // Round to nearest 10 to reduce cache key cardinality
  return Math.min(Math.max(1, Math.ceil(v / 10) * 10), max)
}

/* ── Rate limiter (in-memory, per-IP) ─────────────────────── */

const RATE_WINDOW_MS = 60_000   // 1 minute window
const RATE_MAX_REQUESTS = 120   // max requests per window per IP
const MAX_TRACKED_IPS = 10_000  // hard cap to prevent unbounded memory growth

const ipHits = new Map<string, { count: number; resetAt: number }>()

// Periodically prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip)
  }
}, 300_000).unref()

function checkRateLimit(request: Request): void {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  const now = Date.now()
  let entry = ipHits.get(ip)
  if (!entry || now > entry.resetAt) {
    // Evict oldest 10% when at capacity (Map iterates in insertion order)
    if (ipHits.size >= MAX_TRACKED_IPS) {
      const evictCount = Math.ceil(MAX_TRACKED_IPS * 0.1)
      const it = ipHits.keys()
      for (let i = 0; i < evictCount; i++) {
        const key = it.next().value
        if (key) ipHits.delete(key)
      }
    }
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS }
    ipHits.set(ip, entry)
  }

  entry.count++
  if (entry.count > RATE_MAX_REQUESTS) {
    throw new HttpError(429, { error: "Too many requests" }, {
      "retry-after": String(Math.ceil((entry.resetAt - now) / 1000)),
    })
  }
}

/* ── API ──────────────────────────────────────────────────── */

function createRoutes(bot: BassBot) {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof HttpError) {
        set.status = error.statusCode
        set.headers["content-type"] = "application/json"
        if (error.responseHeaders) {
          for (const [k, v] of Object.entries(error.responseHeaders)) {
            set.headers[k] = v
          }
        }
        // Cast as never so the error body doesn't pollute handler return types
        // (otherwise Eden treaty clients see Record<string, unknown> in the union)
        return error.body as never
      }
    })
    .onBeforeHandle(({ request }) => { checkRateLimit(request) })

    /* ── WebSocket for push updates ─────────────────────── */
    .ws("/ws", {
      open(ws) {
        // Verify JWT from query string for WebSocket auth
        const url = new URL(ws.data.request?.url ?? "", "http://localhost")
        const token = url.searchParams.get("token")
        if (!token) {
          ws.close(4001, "Missing token")
          return
        }
        verifyJwt(token, config.jwtSecret)
          .then(() => addWsClient(ws))
          .catch(() => ws.close(4003, "Invalid token"))
      },
      close(ws) {
        removeWsClient(ws)
      },
      message() {
        // Client→server messages not used; all updates are server-pushed
      },
    })

    /* ── Stats — rarely changes ─────────────────────────── */
    .get("/stats", async ({ request }) => {
      await requireAuth(request)
      return cache.resolve("stats", TTL.STATS, () => {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return {
          botName: bot.user?.displayName ?? "bassbot",
          botAvatar: bot.user?.displayAvatarURL({ size: 64 }) ?? null,
          botId: bot.user?.id ?? null,
          version: pkg.version,
          guildCount: bot.guilds.cache.size,
          userCount: bot.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
          activePlayers: players.filter((p) => p.current).length,
          totalPlayers: players.length,
          uptime: process.uptime(),
          lavalinkNodes: bot.lava.nodes.size,
        }
      })
    })

    /* ── Player list — summary only ─────────────────────── */
    .get("/players", async ({ request }) => {
      await requireAuth(request)
      return cache.resolve("players", TTL.PLAYER_LIST, () => {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return players.map((p) => playerSummary(p, bot))
      })
    })

    /* ── Player detail — configurable list limits ───────── */
    .get("/players/:guildId", async ({ params, query, request }) => {
      await requireAuth(request)
      const ql = clampParam(query.ql, 10, 200)
      const hl = clampParam(query.hl, 10, 200)
      const cacheKey = `player:${params.guildId}:${ql}:${hl}`
      return cache.resolve(cacheKey, TTL.PLAYER_DETAIL, () => {
        const player = bot.getPlayer(params.guildId)
        if (!player) throw new HttpError(404, { error: "Player not found" })
        return playerDetail(player, bot, ql, hl)
      })
    })

    /* ── Player queue page ──────────────────────────────── */
    .get("/players/:guildId/queue", async ({ params, query, request }) => {
      await requireAuth(request)
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      return {
        items: player.queue.slice(offset, offset + limit).map(trackInfo),
        total: player.queue.length,
        offset,
      }
    })

    /* ── Player history page ────────────────────────────── */
    .get("/players/:guildId/history", async ({ params, query, request }) => {
      await requireAuth(request)
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      return {
        items: player.history.slice(offset, offset + limit).map(trackInfo),
        total: player.history.length,
        offset,
      }
    })

    /* ── Guild list ─────────────────────────────────────── */
    .get("/guilds", async ({ request }) => {
      await requireAuth(request)
      return cache.resolve("guilds", TTL.GUILD_LIST, () =>
        bot.guilds.cache.map((g) => {
          const player = bot.lava.players.get(g.id) as PlayerWithQueue | undefined
          const current = player?.current
          return {
            id: g.id,
            name: g.name,
            icon: g.iconURL({ size: 64 }),
            memberCount: g.memberCount,
            hasPlayer: !!player,
            currentSong: current
              ? { title: current.info.title, author: current.info.author }
              : null,
          }
        }),
      )
    })

    /* ── Guild detail — configurable member limit ───────── */
    .get("/guilds/:guildId", async ({ params, query, request }) => {
      await requireAuth(request)
      const ml = clampParam(query.ml, 20, 200)
      const cacheKey = `guild:${params.guildId}:${ml}`
      return cache.resolve(cacheKey, TTL.GUILD_DETAIL, () => {
        const guild = bot.guilds.cache.get(params.guildId)
        if (!guild) throw new HttpError(404, { error: "Guild not found" })

        const owner = guild.members.cache.get(guild.ownerId)
        const allMembers = guild.members.cache
          .sort((a, b) => {
            if (a.id === guild.ownerId) return -1
            if (b.id === guild.ownerId) return 1
            if (a.user.bot !== b.user.bot) return a.user.bot ? 1 : -1
            return a.displayName.localeCompare(b.displayName)
          })
          .map((m) => ({
            id: m.id,
            displayName: m.displayName,
            username: m.user.username,
            avatar: m.user.displayAvatarURL({ size: 32 }),
            isBot: m.user.bot,
            isOwner: m.id === guild.ownerId,
            joinedAt: m.joinedTimestamp,
          }))

        const humanCount = allMembers.filter((m) => !m.isBot).length
        const botCount = allMembers.filter((m) => m.isBot).length

        return {
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL({ size: 128 }),
          banner: guild.bannerURL({ size: 512 }),
          memberCount: guild.memberCount,
          createdAt: guild.createdTimestamp,
          owner: owner
            ? {
                id: owner.id,
                displayName: owner.displayName,
                username: owner.user.username,
                avatar: owner.user.displayAvatarURL({ size: 64 }),
              }
            : null,
          hasPlayer: bot.lava.players.has(guild.id),
          members: allMembers.slice(0, ml),
          memberTotal: allMembers.length,
          humanCount,
          botCount,
        }
      })
    })

    /* ── Guild members page ─────────────────────────────── */
    .get("/guilds/:guildId/members", async ({ params, query, request }) => {
      await requireAuth(request)
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const search = (query.search ?? "").toLowerCase().slice(0, 100)
      const guild = bot.guilds.cache.get(params.guildId)
      if (!guild) throw new HttpError(404, { error: "Guild not found" })

      let members = guild.members.cache
        .sort((a, b) => {
          if (a.id === guild.ownerId) return -1
          if (b.id === guild.ownerId) return 1
          if (a.user.bot !== b.user.bot) return a.user.bot ? 1 : -1
          return a.displayName.localeCompare(b.displayName)
        })
        .map((m) => ({
          id: m.id,
          displayName: m.displayName,
          username: m.user.username,
          avatar: m.user.displayAvatarURL({ size: 32 }),
          isBot: m.user.bot,
          isOwner: m.id === guild.ownerId,
          joinedAt: m.joinedTimestamp,
        }))

      if (search) {
        members = members.filter(
          (m) =>
            m.displayName.toLowerCase().includes(search) ||
            m.username.toLowerCase().includes(search),
        )
      }

      return {
        items: members.slice(offset, offset + limit),
        total: members.length,
        offset,
      }
    })

    /* ── Logs ───────────────────────────────────────────── */
    .get("/logs", async ({ query, request }) => {
      await requireAuth(request)
      const limit = Math.min(parseInt(query.limit ?? "50") || 50, 500)
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(`logs:global:${limit}:${after ?? 0}`, TTL.LOGS, () => getGlobalLog(limit, after))
    })
    .get("/logs/:guildId", async ({ params, query, request }) => {
      await requireAuth(request)
      const limit = Math.min(parseInt(query.limit ?? "50") || 50, 500)
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(
        `logs:${params.guildId}:${limit}:${after ?? 0}`,
        TTL.LOGS,
        () => getGuildLog(params.guildId, limit, after),
      )
    })

    /* ── Player actions (admin only) ────────────────────── */
    .delete("/players/:guildId", async ({ params, request }) => {
      await requireAdmin(request)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      await player.disconnect()
      return { ok: true }
    })
    .post("/players/:guildId/clear", async ({ params, request }) => {
      await requireAdmin(request)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      player.clear()
      return { ok: true }
    })

    /* ── Guild actions (admin only) ─────────────────────── */
    .delete("/guilds/:guildId", async ({ params, request }) => {
      await requireAdmin(request)
      // Gracefully stop player first
      const player = bot.getPlayer(params.guildId)
      if (player) await player.disconnect()

      const guild = bot.guilds.cache.get(params.guildId)
      if (!guild) throw new HttpError(404, { error: "Guild not found" })
      await guild.leave()
      cache.invalidate(`guild:${params.guildId}`)
      cache.invalidate("guilds")
      cache.invalidate("stats")
      return { ok: true }
    })

    /* ── Control settings (admin only) ──────────────────── */
    .get("/control/settings", async ({ request }) => {
      await requireAdmin(request)
      return bot.getSettings()
    })
    .patch("/control/settings", async ({ body, request }) => {
      await requireAdmin(request)
      await bot.updateSettings(body)
      return bot.getSettings()
    }, {
      body: t.Partial(t.Object({
        commandsEnabled: t.Boolean(),
        slogans: t.Array(t.String()),
      })),
    })

    /* ── User player controls (JWT-authenticated) ───────── */

    // Pause / Resume
    .post("/players/:guildId/pause", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      await player.setPaused(true)
      return { ok: true }
    })
    .post("/players/:guildId/resume", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      await player.setPaused(false)
      return { ok: true }
    })

    // Next / Previous
    .post("/players/:guildId/next", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      await player.next()
      return { ok: true }
    })
    .post("/players/:guildId/prev", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      await player.prev()
      return { ok: true }
    })

    // Shuffle
    .post("/players/:guildId/shuffle", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      player.shuffle()
      return { ok: true }
    })

    // Loop toggle (cycles: None → Song → Queue → None)
    .post("/players/:guildId/loop", async ({ params, request }) => {
      await verifyUserInVC(bot, request, params.guildId)
      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })
      const modes = ["None", "Song", "Queue"] as const
      const currentIdx = modes.indexOf(player.loopMode as typeof modes[number])
      const nextMode = modes[(currentIdx + 1) % modes.length]!
      player.setLoopMode(nextMode)
      return { ok: true, loopMode: nextMode }
    })

    // Search for tracks
    .get("/players/:guildId/search", async ({ query, request }) => {
      await requireAuth(request)

      const q = typeof query.q === "string" ? query.q.slice(0, 200) : ""
      if (!q) throw new HttpError(400, { error: "Missing search query" })

      const node = bot.lava.nodes.values().next().value
      if (!node) throw new HttpError(503, { error: "No Lavalink nodes available" })

      // Try raw search first for multiple results
      const rawResults = await node.rest.resolve(`ytsearch:${q}`)
      if (rawResults?.loadType === LoadType.SEARCH && rawResults.data.length > 0) {
        return {
          results: rawResults.data.slice(0, 10).map((t: Track) => ({
            title: t.info.title,
            author: t.info.author,
            uri: t.info.uri ?? "",
            length: t.info.length,
            artworkUrl: t.info.artworkUrl ?? null,
          })),
        }
      }

      // Fallback to resolveSong
      const result = await resolveSong(q, node)
      if (!result.success) return { results: [] }

      if (result.value.type === "playlist") {
        return {
          results: result.value.tracks.slice(0, 10).map((t: Track) => ({
            title: t.info.title,
            author: t.info.author,
            uri: t.info.uri ?? "",
            length: t.info.length,
            artworkUrl: t.info.artworkUrl ?? null,
          })),
        }
      }

      return {
        results: [{
          title: result.value.track.info.title,
          author: result.value.track.info.author,
          uri: result.value.track.info.uri ?? "",
          length: result.value.track.info.length,
          artworkUrl: result.value.track.info.artworkUrl ?? null,
        }],
      }
    })

    // Add track to queue
    .post("/players/:guildId/queue", async ({ params, body, request }) => {
      await verifyUserInVC(bot, request, params.guildId)

      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })

      const node = bot.lava.nodes.values().next().value
      if (!node) throw new HttpError(503, { error: "No Lavalink nodes available" })

      const result = await resolveSong(body.uri, node)
      if (!result.success) throw new HttpError(400, { error: result.error ?? "Failed to resolve track" })

      const addNext = body.position === "next"

      if (result.value.type === "playlist") {
        await player.addTracks(result.value.tracks, addNext)
        return { ok: true, added: result.value.tracks.length }
      } else {
        await player.addTrack(result.value.track, addNext)
        return { ok: true, added: 1 }
      }
    }, {
      body: t.Object({
        uri: t.String({ minLength: 1, maxLength: 2000 }),
        position: t.Optional(t.Union([t.Literal("next"), t.Literal("end")])),
      }),
    })

    // Remove track from queue
    .post("/players/:guildId/queue/remove", async ({ params, body, request }) => {
      await verifyUserInVC(bot, request, params.guildId)

      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })

      if (body.index >= player.queue.length) {
        throw new HttpError(400, { error: "Invalid index" })
      }

      const removed = player.remove(body.index, body.index)
      if (!removed) throw new HttpError(400, { error: "Failed to remove track" })
      return { ok: true }
    }, {
      body: t.Object({
        index: t.Integer({ minimum: 0 }),
      }),
    })

    // Move track in queue (for drag-and-drop)
    .post("/players/:guildId/queue/move", async ({ params, body, request }) => {
      await verifyUserInVC(bot, request, params.guildId)

      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })

      if (body.from >= player.queue.length || body.to >= player.queue.length) {
        throw new HttpError(400, { error: "Invalid indices" })
      }

      const moved = player.moveTrack(body.from, body.to)
      if (!moved) throw new HttpError(400, { error: "Failed to move track" })
      return { ok: true }
    }, {
      body: t.Object({
        from: t.Integer({ minimum: 0 }),
        to: t.Integer({ minimum: 0 }),
      }),
    })

    // Set volume
    .post("/players/:guildId/volume", async ({ params, body, request }) => {
      await verifyUserInVC(bot, request, params.guildId)

      const player = bot.getPlayer(params.guildId)
      if (!player) throw new HttpError(404, { error: "Player not found" })

      await player.setGlobalVolume(body.volume / 2)
      return { ok: true }
    }, {
      body: t.Object({
        volume: t.Number({ minimum: 0, maximum: 100 }),
      }),
    })
}

/**
 * Verify JWT and check user is in the same voice channel as the bot.
 * Returns the JWT payload on success, or throws HttpError on failure.
 */
async function verifyUserInVC(
  bot: BassBot,
  request: Request,
  guildId: string,
): Promise<JwtPayload> {
  const user = await verifyAuthHeader(request.headers.get("authorization"), config.jwtSecret)
  if (!user) throw new HttpError(401, { error: "Unauthorized" })

  // Admins bypass voice channel check
  if (user.role === "admin") return user

  const guild = bot.guilds.cache.get(guildId)
  if (!guild) throw new HttpError(404, { error: "Guild not found" })

  // Check if the user is in the guild
  const member = guild.members.cache.get(user.discordId)
  if (!member) throw new HttpError(403, { error: "You are not a member of this server" })

  // Check if the bot is in a voice channel
  const botVC = guild.members.me?.voice.channel
  if (!botVC) throw new HttpError(400, { error: "Bot is not in a voice channel" })

  // Check if the user is in the same voice channel as the bot
  const userVC = member.voice.channel
  if (userVC?.id !== botVC.id) throw new HttpError(403, { error: "You must be in the same voice channel as the bot" })

  return user
}

export type App = ReturnType<typeof createRoutes>

export function startApiServer(bot: BassBot, port: number) {
  const app = new Elysia()
    .use(cors())
    .use(new Elysia({ prefix: "/api" }).use(createRoutes(bot)))

  app.listen({ port, maxRequestBodySize: 1_048_576 }) // 1 MB

  logger.info(`REST API running on port ${port}`)
  return app
}
