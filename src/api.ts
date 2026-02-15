import type { BassBot } from "./bot"
import type { PlayerWithQueue } from "./player"
import logger from "@bot/logger"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  })
}

function getPlayerInfo(player: PlayerWithQueue, bot: BassBot) {
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

export function startApiServer(bot: BassBot, port: number) {
  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url)

      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS })
      }

      // ─── Routes ─────────────────────────────────────────────────────

      // GET /api/stats — general bot statistics
      if (url.pathname === "/api/stats") {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        const activePlayers = players.filter((p) => p.current)

        return json({
          guildCount: bot.guilds.cache.size,
          userCount: bot.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
          activePlayers: activePlayers.length,
          totalPlayers: players.length,
          uptime: process.uptime(),
          lavalinkNodes: bot.lava.nodes.size,
        })
      }

      // GET /api/players — list all active players
      if (url.pathname === "/api/players") {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return json(players.map((p) => getPlayerInfo(p, bot)))
      }

      // GET /api/players/:guildId — single player detail
      const playerMatch = /^\/api\/players\/(\d+)$/.exec(url.pathname)
      if (playerMatch) {
        const player = bot.getPlayer(playerMatch[1]!)
        if (!player) return json({ error: "Player not found" }, 404)
        return json(getPlayerInfo(player, bot))
      }

      // GET /api/guilds — list all guilds
      if (url.pathname === "/api/guilds") {
        const guilds = bot.guilds.cache.map((g) => ({
          id: g.id,
          name: g.name,
          icon: g.iconURL({ size: 64 }),
          memberCount: g.memberCount,
          hasPlayer: bot.lava.players.has(g.id),
        }))
        return json(guilds)
      }

      return json({ error: "Not found" }, 404)
    },
  })

  logger.info(`Dashboard API running on port ${server.port}`)
  return server
}
