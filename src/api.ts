import { Elysia, status, t } from "elysia"
import { cors } from "@elysiajs/cors"
import { jwtVerify } from "jose"
import type { BassBot } from "./bot"
import type { PlayerWithQueue } from "./player"
import { LoadType, type Track } from "shoukaku"
import { getGlobalLog, getGuildLog } from "./util/activity-log"
import { cache } from "./util/api-cache"
import { addWsClient, removeWsClient } from "./util/broadcast"
import { resolveSong } from "./util/song-search"
import logger from "@bot/logger"
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
    loopMode: (player as any).loopMode ?? "None",
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

/* ── API ──────────────────────────────────────────────────── */

function createApi(bot: BassBot) {
  return new Elysia()
    .use(cors())

    /* ── WebSocket for push updates ─────────────────────── */
    .ws("/api/ws", {
      open(ws) {
        addWsClient(ws)
      },
      close(ws) {
        removeWsClient(ws)
      },
      message() {
        // Client→server messages not used; all updates are server-pushed
      },
    })

    /* ── Stats — rarely changes ─────────────────────────── */
    .get("/api/stats", () =>
      cache.resolve("stats", TTL.STATS, () => {
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
      }),
    )

    /* ── Player list — summary only ─────────────────────── */
    .get("/api/players", () =>
      cache.resolve("players", TTL.PLAYER_LIST, () => {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return players.map((p) => playerSummary(p, bot))
      }),
    )

    /* ── Player detail — configurable list limits ───────── */
    .get("/api/players/:guildId", ({ params, query }) => {
      const ql = Math.min(parseInt(query.ql ?? "10") || 10, 100)
      const hl = Math.min(parseInt(query.hl ?? "10") || 10, 100)
      const cacheKey = `player:${params.guildId}:${ql}:${hl}`
      return cache.resolve(cacheKey, TTL.PLAYER_DETAIL, () => {
        const player = bot.getPlayer(params.guildId)
        if (!player) return status(404, { error: "Player not found" })
        return playerDetail(player, bot, ql, hl)
      })
    })

    /* ── Player queue page ──────────────────────────────── */
    .get("/api/players/:guildId/queue", ({ params, query }) => {
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      return {
        items: player.queue.slice(offset, offset + limit).map(trackInfo),
        total: player.queue.length,
        offset,
      }
    })

    /* ── Player history page ────────────────────────────── */
    .get("/api/players/:guildId/history", ({ params, query }) => {
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      return {
        items: player.history.slice(offset, offset + limit).map(trackInfo),
        total: player.history.length,
        offset,
      }
    })

    /* ── Guild list ─────────────────────────────────────── */
    .get("/api/guilds", () =>
      cache.resolve("guilds", TTL.GUILD_LIST, () =>
        bot.guilds.cache.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL({ size: 64 }),
          memberCount: g.memberCount,
          hasPlayer: bot.lava.players.has(g.id),
        })),
      ),
    )

    /* ── Guild detail — configurable member limit ───────── */
    .get("/api/guilds/:guildId", ({ params, query }) => {
      const ml = Math.min(parseInt(query.ml ?? "20") || 20, 200)
      const cacheKey = `guild:${params.guildId}:${ml}`
      return cache.resolve(cacheKey, TTL.GUILD_DETAIL, () => {
        const guild = bot.guilds.cache.get(params.guildId)
        if (!guild) return status(404, { error: "Guild not found" })

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
    .get("/api/guilds/:guildId/members", ({ params, query }) => {
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const search = (query.search ?? "").toLowerCase()
      const guild = bot.guilds.cache.get(params.guildId)
      if (!guild) return status(404, { error: "Guild not found" })

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
    .get("/api/logs", ({ query }) => {
      const limit = parseInt(query.limit ?? "50")
      return cache.resolve(`logs:global:${limit}`, TTL.LOGS, () => getGlobalLog(limit))
    })
    .get("/api/logs/:guildId", ({ params, query }) => {
      const limit = parseInt(query.limit ?? "50")
      return cache.resolve(
        `logs:${params.guildId}:${limit}`,
        TTL.LOGS,
        () => getGuildLog(params.guildId, limit),
      )
    })

    /* ── Player actions ─────────────────────────────────── */
    .delete("/api/players/:guildId", async ({ params }) => {
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.disconnect()
      return { ok: true }
    })
    .post("/api/players/:guildId/clear", ({ params }) => {
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      player.clear()
      return { ok: true }
    })

    /* ── Guild actions ──────────────────────────────────── */
    .delete("/api/guilds/:guildId", async ({ params }) => {
      // Gracefully stop player first
      const player = bot.getPlayer(params.guildId)
      if (player) await player.disconnect()

      const guild = bot.guilds.cache.get(params.guildId)
      if (!guild) return status(404, { error: "Guild not found" })
      await guild.leave()
      cache.invalidate(`guild:${params.guildId}`)
      cache.invalidate("guilds")
      cache.invalidate("stats")
      return { ok: true }
    })

    /* ── Control settings ───────────────────────────────── */
    .get("/api/control/settings", () => bot.getSettings())
    .patch("/api/control/settings", async ({ body }) => {
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
    .post("/api/players/:guildId/pause", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.setPaused(true)
      return { ok: true }
    })
    .post("/api/players/:guildId/resume", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.setPaused(false)
      return { ok: true }
    })

    // Next / Previous
    .post("/api/players/:guildId/next", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.next()
      return { ok: true }
    })
    .post("/api/players/:guildId/prev", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.prev()
      return { ok: true }
    })

    // Shuffle
    .post("/api/players/:guildId/shuffle", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      player.shuffle()
      return { ok: true }
    })

    // Loop toggle (cycles: None → Song → Queue → None)
    .post("/api/players/:guildId/loop", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      const modes = ["None", "Song", "Queue"] as const
      const currentIdx = modes.indexOf((player as any).loopMode ?? "None")
      const nextMode = modes[(currentIdx + 1) % modes.length]!
      player.setLoopMode(nextMode)
      return { ok: true, loopMode: nextMode }
    })

    // Search for tracks
    .get("/api/players/:guildId/search", async ({ query, request }) => {
      const user = await verifyJwt(request)
      if (!user) return status(401, { error: "Unauthorized" })

      const q = query.q
      if (!q) return status(400, { error: "Missing search query" })

      const node = bot.lava.nodes.values().next().value
      if (!node) return status(503, { error: "No Lavalink nodes available" })

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
    .post("/api/players/:guildId/queue", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user

      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })

      const body = await request.json() as { uri: string }
      if (!body.uri) return status(400, { error: "Missing track URI" })

      const node = bot.lava.nodes.values().next().value
      if (!node) return status(503, { error: "No Lavalink nodes available" })

      const result = await resolveSong(body.uri, node)
      if (!result.success) return status(400, { error: result.error ?? "Failed to resolve track" })

      if (result.value.type === "playlist") {
        await player.addTracks(result.value.tracks)
        return { ok: true, added: result.value.tracks.length }
      } else {
        await player.addTrack(result.value.track)
        return { ok: true, added: 1 }
      }
    })
}

/* ── JWT verification helpers ─────────────────────────────── */

interface JwtPayload {
  sub: string
  discordId: string
  role: "admin" | "user"
  name: string
  avatar: string
}

async function verifyJwt(request: Request): Promise<JwtPayload | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    logger.warn("[api] JWT_SECRET not set — rejecting authenticated requests")
    return null
  }

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  try {
    const { payload } = await jwtVerify(
      authHeader.slice(7),
      new TextEncoder().encode(secret),
    )
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/**
 * Verify JWT and check user is in the same voice channel as the bot.
 * Returns the JWT payload on success, or a Response on failure.
 */
async function verifyUserInVC(
  bot: BassBot,
  request: Request,
  guildId: string,
): Promise<JwtPayload | Response> {
  const user = await verifyJwt(request)
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })

  // Admins bypass voice channel check
  if (user.role === "admin") return user

  const guild = bot.guilds.cache.get(guildId)
  if (!guild) return new Response(JSON.stringify({ error: "Guild not found" }), { status: 404 })

  // Check if the user is in the guild
  const member = guild.members.cache.get(user.discordId)
  if (!member) {
    return new Response(
      JSON.stringify({ error: "You are not a member of this server" }),
      { status: 403 },
    )
  }

  // Check if the bot is in a voice channel
  const botVC = guild.members.me?.voice.channel
  if (!botVC) {
    return new Response(
      JSON.stringify({ error: "Bot is not in a voice channel" }),
      { status: 400 },
    )
  }

  // Check if the user is in the same voice channel as the bot
  const userVC = member.voice.channel
  if (userVC?.id !== botVC.id) {
    return new Response(
      JSON.stringify({ error: "You must be in the same voice channel as the bot" }),
      { status: 403 },
    )
  }

  return user
}

export type App = ReturnType<typeof createApi>

export function startApiServer(bot: BassBot, port: number) {
  const app = createApi(bot)

  app.listen(port)

  logger.info(`REST API running on port ${port}`)
  return app
}
