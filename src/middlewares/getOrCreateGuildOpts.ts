import { createMiddleware } from "@bot/middleware"
import db from "@/util/db"

export default createMiddleware(async ({ i }) => {
  let guildOpts = await db.guildOptions.find({
    guildId: i.guild.id,
  })
  guildOpts ??= await db.guildOptions.create({
    guildId: i.guild.id,
  })
  return { guildOpts }
})
