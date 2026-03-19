import { Elysia, t } from "elysia"
import type { BassBot } from "../../bot"
import { requireAdmin } from "../auth"

export function controlRoutes(bot: BassBot) {
  return new Elysia()
    .get("/control/settings", async ({ request }) => {
      await requireAdmin(request)
      return bot.getSettings()
    })
    .patch("/control/settings", async ({ body, request }) => {
      await requireAdmin(request)
      await bot.updateSettings(body)
      return bot.getSettings()
    }, {
      body: t.Partial(t.Object({
        commandsEnabled: t.Boolean(),
        slogans: t.Array(t.String()),
      })),
    })
}
