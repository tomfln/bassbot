import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import type { BassBot } from "../bot"
import logger from "@bot/logger"
import { wsRoutes } from "./routes/ws"
import { statsRoutes } from "./routes/stats"
import { playerRoutes } from "./routes/players"
import { guildRoutes } from "./routes/guilds"
import { logRoutes } from "./routes/logs"
import { controlRoutes } from "./routes/control"

function createRoutes(bot: BassBot) {
  return new Elysia()
    .use(wsRoutes)
    .use(statsRoutes(bot))
    .use(playerRoutes(bot))
    .use(guildRoutes(bot))
    .use(logRoutes())
    .use(controlRoutes(bot))
}

export type App = ReturnType<typeof createRoutes>

export function startApiServer(bot: BassBot, port: number) {
  const app = new Elysia()
    .use(cors())
    .use(new Elysia({ prefix: "/api" }).use(createRoutes(bot)))

  app.listen(port)

  logger.info(`REST API running on port ${port}`)
  return app
}
