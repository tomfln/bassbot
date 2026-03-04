import { Elysia } from "elysia"
import { getGlobalLog, getGuildLog } from "../../util/activity-log"
import { cache } from "../../util/api-cache"

const TTL = 5_000

export function logRoutes() {
  return new Elysia()
    .get("/logs", ({ query }) => {
      const limit = parseInt(query.limit ?? "50")
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(`logs:global:${limit}:${after ?? 0}`, TTL, () => getGlobalLog(limit, after))
    })
    .get("/logs/:guildId", ({ params, query }) => {
      const limit = parseInt(query.limit ?? "50")
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(
        `logs:${params.guildId}:${limit}:${after ?? 0}`,
        TTL,
        () => getGuildLog(params.guildId, limit, after),
      )
    })
}
