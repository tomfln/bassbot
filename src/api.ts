import { Elysia, status } from "elysia"
import { cors } from "@elysiajs/cors"
import { staticPlugin } from "@elysiajs/static"
import type { BassBot } from "./bot"
import type { PlayerWithQueue } from "./player"
import { getGlobalLog, getGuildLog } from "./util/activity-log"
import { cache } from "./util/api-cache"
import { addWsClient, removeWsClient } from "./util/broadcast"
import logger from "@bot/logger"
import { join } from "node:path"
import { existsSync, readFileSync } from "node:fs"

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
}

export type App = ReturnType<typeof createApi>

export function startApiServer(bot: BassBot, port: number) {
  const dashboardDir = join(import.meta.dir, "..", "dashboard", "dist")
  const hasDashboard = existsSync(dashboardDir)

  if (hasDashboard) {
    logger.info("Serving dashboard from " + dashboardDir)
  }

  const app = createApi(bot)

  if (hasDashboard) {
    const indexHtml = readFileSync(join(dashboardDir, "index.html"), "utf-8")

    const serveHtml = () =>
      new Response(indexHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      })

    app
      .use(
        staticPlugin({
          assets: dashboardDir,
          prefix: "/",
          indexHTML: true,
          ignorePatterns: ["*.html"],
        }),
      )
      .get("/", () => serveHtml())
      .onError(({ code, path }) => {
        if (code === "NOT_FOUND" && !path.startsWith("/api")) {
          return serveHtml()
        }
      })
  }

  app.listen(port)

  logger.info(`Dashboard running on port ${port}`)
  return app
}
