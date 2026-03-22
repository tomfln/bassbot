import { Elysia } from "elysia"
import type { BassBot } from "../../bot"
import type { PlayerWithQueue } from "../../player"
import { cache } from "../../util/api-cache"
import { HttpError } from "../error"
import { requireAuth, requireAdmin } from "../auth"
import { clampParam } from "../helpers"

/* ── Cache TTLs (ms) ─────────────────────────────────────── */

const TTL = {
  GUILD_LIST:   30_000,
  GUILD_DETAIL: 10_000,
} as const

/* ── Helpers ──────────────────────────────────────────────── */

function getGuild(bot: BassBot, guildId: string) {
  const guild = bot.guilds.cache.get(guildId)
  if (!guild) throw new HttpError(404, { error: "Guild not found" })
  return guild
}

/* ── Routes ───────────────────────────────────────────────── */

export function guildRoutes(bot: BassBot) {
  return new Elysia()

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
        const guild = getGuild(bot, params.guildId)

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
      const search = (query.search ?? "").slice(0, 100).toLowerCase()
      const guild = getGuild(bot, params.guildId)

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

    /* ── Admin: leave guild ─────────────────────────────── */
    .delete("/guilds/:guildId", async ({ params, request }) => {
      await requireAdmin(request)
      const player = bot.getPlayer(params.guildId)
      if (player) await player.disconnect()

      const guild = getGuild(bot, params.guildId)
      await guild.leave()
      cache.invalidate(`guild:${params.guildId}`)
      cache.invalidate("guilds")
      cache.invalidate("stats")
      return { ok: true }
    })
}
