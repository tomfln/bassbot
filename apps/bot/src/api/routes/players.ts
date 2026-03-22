import { Elysia, t } from "elysia"
import type { BassBot } from "../../bot"
import type { PlayerWithQueue } from "../../player"
import { LoadType, type Track } from "shoukaku"
import { cache } from "../../util/api-cache"
import { resolveSong } from "../../util/song-search"
import { HttpError } from "../error"
import { requireAuth, requireAdmin, requireUserInVC } from "../auth"
import { clampParam } from "../helpers"

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

/* ── Helpers ──────────────────────────────────────────────── */

function getPlayer(bot: BassBot, guildId: string): PlayerWithQueue {
  const player = bot.getPlayer(guildId)
  if (!player) throw new HttpError(404, { error: "Player not found" })
  return player
}

function getNode(bot: BassBot) {
  const node = bot.lava.nodes.values().next().value
  if (!node) throw new HttpError(503, { error: "No Lavalink nodes available" })
  return node
}

/* ── Routes ───────────────────────────────────────────────── */

export function playerRoutes(bot: BassBot) {
  return new Elysia()

    /* ── Player list ────────────────────────────────────── */
    .get("/players", async ({ request }) => {
      await requireAuth(request)
      return cache.resolve("players", TTL.PLAYER_LIST, () => {
        const players = [...bot.lava.players.values()] as PlayerWithQueue[]
        return players.map((p) => playerSummary(p, bot))
      })
    })

    /* ── Player detail ──────────────────────────────────── */
    .get("/players/:guildId", async ({ params, query, request }) => {
      await requireAuth(request)
      const ql = clampParam(query.ql, 10, 200)
      const hl = clampParam(query.hl, 10, 200)
      const cacheKey = `player:${params.guildId}:${ql}:${hl}`
      return cache.resolve(cacheKey, TTL.PLAYER_DETAIL, () => {
        const player = getPlayer(bot, params.guildId)
        return playerDetail(player, bot, ql, hl)
      })
    })

    /* ── Player queue page ──────────────────────────────── */
    .get("/players/:guildId/queue", async ({ params, query, request }) => {
      await requireAuth(request)
      const offset = parseInt(query.offset ?? "0") || 0
      const limit = Math.min(parseInt(query.limit ?? "20") || 20, 200)
      const player = getPlayer(bot, params.guildId)
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
      const player = getPlayer(bot, params.guildId)
      return {
        items: player.history.slice(offset, offset + limit).map(trackInfo),
        total: player.history.length,
        offset,
      }
    })

    /* ── Admin: destroy / clear player ──────────────────── */
    .delete("/players/:guildId", async ({ params, request }) => {
      await requireAdmin(request)
      const player = getPlayer(bot, params.guildId)
      await player.disconnect()
      return { ok: true }
    })
    .post("/players/:guildId/clear", async ({ params, request }) => {
      await requireAdmin(request)
      const player = getPlayer(bot, params.guildId)
      player.clear()
      return { ok: true }
    })

    /* ── User controls (must be in same VC) ─────────────── */
    .post("/players/:guildId/pause", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      await player.setPaused(true)
      return { ok: true }
    })
    .post("/players/:guildId/resume", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      await player.setPaused(false)
      return { ok: true }
    })
    .post("/players/:guildId/next", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      await player.next()
      return { ok: true }
    })
    .post("/players/:guildId/prev", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      await player.prev()
      return { ok: true }
    })
    .post("/players/:guildId/shuffle", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      player.shuffle()
      return { ok: true }
    })
    .post("/players/:guildId/loop", async ({ params, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      const modes = ["None", "Song", "Queue"] as const
      const currentIdx = modes.indexOf(player.loopMode as typeof modes[number])
      const nextMode = modes[(currentIdx + 1) % modes.length]!
      player.setLoopMode(nextMode)
      return { ok: true, loopMode: nextMode }
    })

    /* ── Search ─────────────────────────────────────────── */
    .get("/players/:guildId/search", async ({ query, request }) => {
      await requireAuth(request)
      const q = typeof query.q === "string" ? query.q.slice(0, 200) : ""
      if (!q) throw new HttpError(400, { error: "Missing search query" })

      const node = getNode(bot)
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

    /* ── Queue mutations ────────────────────────────────── */
    .post("/players/:guildId/queue", async ({ params, body, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      const node = getNode(bot)

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

    .post("/players/:guildId/queue/remove", async ({ params, body, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      if (body.index >= player.queue.length) throw new HttpError(400, { error: "Invalid index" })
      const removed = player.remove(body.index, body.index)
      if (!removed) throw new HttpError(400, { error: "Failed to remove track" })
      return { ok: true }
    }, {
      body: t.Object({ index: t.Integer({ minimum: 0 }) }),
    })

    .post("/players/:guildId/queue/move", async ({ params, body, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
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

    .post("/players/:guildId/volume", async ({ params, body, request }) => {
      await requireUserInVC(bot, request, params.guildId)
      const player = getPlayer(bot, params.guildId)
      await player.setGlobalVolume(body.volume / 2)
      return { ok: true }
    }, {
      body: t.Object({ volume: t.Number({ minimum: 0, maximum: 100 }) }),
    })
}
