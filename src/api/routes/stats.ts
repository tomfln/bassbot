import { Elysia } from "elysia"
import type { BassBot } from "../../bot"
import type { PlayerWithQueue } from "../../player"
import { cache } from "../../util/api-cache"
import { join } from "node:path"
import { readFileSync } from "node:fs"

const pkg = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "..", "package.json"), "utf-8")) as { version: string }

const TTL = 30_000

export function statsRoutes(bot: BassBot) {
  return new Elysia()
    .get("/stats", () =>
      cache.resolve("stats", TTL, () => {
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
}
