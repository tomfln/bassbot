import { Elysia, status } from "elysia"
import { cors } from "@elysiajs/cors"
import { staticPlugin } from "@elysiajs/static"
import type { BassBot } from "./bot"
import type { PlayerWithQueue } from "./player"
import { getGlobalLog, getGuildLog } from "./util/activity-log"
import logger from "@bot/logger"
import { join } from "node:path"
import { existsSync, readFileSync } from "node:fs"

function playerInfo(player: PlayerWithQueue, bot: BassBot) {
  const guild = bot.guilds.cache.get(player.guildId)
  const vc = guild?.members.me?.voice.channel

  return {
    guildId: player.guildId,
    guildName: guild?.name ?? "Unknown",
    guildIcon: guild?.iconURL({ size: 64 }),
    paused: player.paused,
    position: player.position,
    current: player.current
      ? {
          title: player.current.info.title,
          author: player.current.info.author,
          uri: player.current.info.uri,
          artworkUrl: player.current.info.artworkUrl,
          length: player.current.info.length,
          sourceName: player.current.info.sourceName,
        }
      : null,
    queue: player.queue.map((t) => ({
      title: t.info.title,
      author: t.info.author,
      uri: t.info.uri,
      artworkUrl: t.info.artworkUrl,
      length: t.info.length,
    })),
    history: player.history.map((t) => ({
      title: t.info.title,
      author: t.info.author,
      uri: t.info.uri,
      artworkUrl: t.info.artworkUrl,
      length: t.info.length,
    })),
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
  }
}

function createApi(bot: BassBot) {
  return new Elysia()
    .use(cors())
    .get("/api/stats", () => {
      const players = [...bot.lava.players.values()] as PlayerWithQueue[]
      return {
        guildCount: bot.guilds.cache.size,
        userCount: bot.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        activePlayers: players.filter((p) => p.current).length,
        totalPlayers: players.length,
        uptime: process.uptime(),
        lavalinkNodes: bot.lava.nodes.size,
      }
    })
    .get("/api/players", () => {
      const players = [...bot.lava.players.values()] as PlayerWithQueue[]
      return players.map((p) => playerInfo(p, bot))
    })
    .get("/api/players/:guildId", ({ params }) => {
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      return playerInfo(player, bot)
    })
    .get("/api/guilds", () =>
      bot.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL({ size: 64 }),
        memberCount: g.memberCount,
        hasPlayer: bot.lava.players.has(g.id),
      })),
    )
    .get("/api/logs", ({ query }) => {
      const limit = parseInt(query.limit ?? "50")
      return getGlobalLog(limit)
    })
    .get("/api/logs/:guildId", ({ params, query }) => {
      const limit = parseInt(query.limit ?? "50")
      return getGuildLog(params.guildId, limit)
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
    // Read index.html as string to avoid Bun's HTML module resolution
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
        // SPA fallback: serve index.html for non-API 404s
        if (code === "NOT_FOUND" && !path.startsWith("/api")) {
          return serveHtml()
        }
      })
  }

  app.listen(port)

  logger.info(`Dashboard running on port ${port}`)
  return app
}
