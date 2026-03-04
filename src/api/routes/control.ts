import { Elysia, t } from "elysia"
import type { BassBot } from "../../bot"

export function controlRoutes(bot: BassBot) {
  return new Elysia()
    .get("/control/settings", () => bot.getSettings())
    .patch("/control/settings", async ({ body }) => {
      await bot.updateSettings(body)
      return bot.getSettings()
    }, {
      body: t.Partial(t.Object({
        commandsEnabled: t.Boolean(),
        slogans: t.Array(t.String()),
      })),
    })
}
