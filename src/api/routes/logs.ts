import { Elysia } from "elysia"
import { getGlobalLog, getGuildLog } from "../../util/activity-log"
import { cache } from "../../util/api-cache"
import { requireAuth } from "../auth"

const TTL = 5_000

export function logRoutes() {
  return new Elysia()
    .get("/logs", async ({ query, request }) => {
      await requireAuth(request)
      const limit = Math.min(parseInt(query.limit ?? "50") || 50, 500)
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(`logs:global:${limit}:${after ?? 0}`, TTL, () => getGlobalLog(limit, after))
    })
    .get("/logs/:guildId", async ({ params, query, request }) => {
      await requireAuth(request)
      const limit = Math.min(parseInt(query.limit ?? "50") || 50, 500)
      const after = query.after ? parseInt(query.after) : undefined
      return cache.resolve(
        `logs:${params.guildId}:${limit}:${after ?? 0}`,
        TTL,
        () => getGuildLog(params.guildId, limit, after),
      )
    })
}
