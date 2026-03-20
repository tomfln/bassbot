import { createMiddleware } from "@lib/middleware"

export default createMiddleware(async ({ i, bot }, abort) => {
  const player = bot.getPlayer(i.guildId)

  if (!player) return abort.warn("There is no music playing")

  return { player }
})
