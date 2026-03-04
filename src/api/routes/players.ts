import { Elysia, status } from "elysia"
import type { BassBot } from "../../bot"
import type { PlayerWithQueue } from "../../player"
import { LoadType, type Track } from "shoukaku"
import { cache } from "../../util/api-cache"
import { resolveSong } from "../../util/song-search"
import { verifyJwt, verifyUserInVC } from "../auth"

/* ── Cache TTLs (ms) ─────────────────────────────────────── */

const TTL = {
  PLAYER_LIST:   5_000,
  PLAYER_DETAIL: 2_000,
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

/* ── Routes ───────────────────────────────────────────────── */

export function playerRoutes(bot: BassBot) {
  return new Elysia()

    /* ── Player list — summary only ─────────────────────── */
    .get("/players", () =>
      cache.resolve("players", TTL.PLAYER_LIST, () => {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return players.map((p) => playerSummary(p, bot))
      }),
    )

    /* ── Player detail — configurable list limits ───────── */
    .get("/players/:guildId", ({ params, query }) => {
      const ql = Math.min(parseInt(query.ql ?? "10") || 10, 5000)
      const hl = Math.min(parseInt(query.hl ?? "10") || 10, 5000)
      const cacheKey = `player:${params.guildId}:${ql}:${hl}`
      return cache.resolve(cacheKey, TTL.PLAYER_DETAIL, () => {
        const player = bot.getPlayer(params.guildId)
        if (!player) return status(404, { error: "Player not found" })
        return playerDetail(player, bot, ql, hl)
      })
    })

    /* ── Player queue page ──────────────────────────────── */
    .get("/players/:guildId/queue", ({ params, query }) => {
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
    .get("/players/:guildId/history", ({ params, query }) => {
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

    /* ── Player actions (admin) ─────────────────────────── */
    .delete("/players/:guildId", async ({ params }) => {
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.disconnect()
      return { ok: true }
    })
    .post("/players/:guildId/clear", ({ params }) => {
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      player.clear()
      return { ok: true }
    })

    /* ── User player controls (JWT-authenticated) ───────── */

    // Pause / Resume
    .post("/players/:guildId/pause", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.setPaused(true)
      return { ok: true }
    })
    .post("/players/:guildId/resume", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.setPaused(false)
      return { ok: true }
    })

    // Next / Previous
    .post("/players/:guildId/next", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.next()
      return { ok: true }
    })
    .post("/players/:guildId/prev", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      await player.prev()
      return { ok: true }
    })

    // Shuffle
    .post("/players/:guildId/shuffle", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      player.shuffle()
      return { ok: true }
    })

    // Loop toggle (cycles: None → Song → Queue → None)
    .post("/players/:guildId/loop", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user
      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })
      const modes = ["None", "Song", "Queue"] as const
      const currentIdx = modes.indexOf(player.loopMode as typeof modes[number])
      const nextMode = modes[(currentIdx + 1) % modes.length]!
      player.setLoopMode(nextMode)
      return { ok: true, loopMode: nextMode }
    })

    // Search for tracks
    .get("/players/:guildId/search", async ({ query, request }) => {
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
    .post("/players/:guildId/queue", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user

      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })

      const body = await request.json() as { uri: string; position?: "next" | "end" }
      if (!body.uri) return status(400, { error: "Missing track URI" })

      const node = bot.lava.nodes.values().next().value
      if (!node) return status(503, { error: "No Lavalink nodes available" })

      const result = await resolveSong(body.uri, node)
      if (!result.success) return status(400, { error: result.error ?? "Failed to resolve track" })

      const addNext = body.position === "next"

      if (result.value.type === "playlist") {
        await player.addTracks(result.value.tracks, addNext)
        return { ok: true, added: result.value.tracks.length }
      } else {
        await player.addTrack(result.value.track, addNext)
        return { ok: true, added: 1 }
      }
    })

    // Remove track from queue
    .post("/players/:guildId/queue/remove", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user

      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })

      const body = await request.json() as { index: number }
      if (typeof body.index !== "number" || body.index < 0 || body.index >= player.queue.length) {
        return status(400, { error: "Invalid index" })
      }

      const removed = player.remove(body.index, body.index)
      if (!removed) return status(400, { error: "Failed to remove track" })
      return { ok: true }
    })

    // Move track in queue (for drag-and-drop)
    .post("/players/:guildId/queue/move", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user

      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })

      const body = await request.json() as { from: number; to: number }
      if (
        typeof body.from !== "number" || typeof body.to !== "number" ||
        body.from < 0 || body.from >= player.queue.length ||
        body.to < 0 || body.to >= player.queue.length
      ) {
        return status(400, { error: "Invalid indices" })
      }

      const moved = player.moveTrack(body.from, body.to)
      if (!moved) return status(400, { error: "Failed to move track" })
      return { ok: true }
    })

    // Set volume
    .post("/players/:guildId/volume", async ({ params, request }) => {
      const user = await verifyUserInVC(bot, request, params.guildId)
      if (user instanceof Response) return user

      const player = bot.getPlayer(params.guildId)
      if (!player) return status(404, { error: "Player not found" })

      const body = await request.json() as { volume: number }
      if (typeof body.volume !== "number" || body.volume < 0 || body.volume > 100) {
        return status(400, { error: "Volume must be 0-100" })
      }

      await player.setGlobalVolume(body.volume / 2)
      return { ok: true }
    })
}
