import { createMiddleware } from "@bot/middleware"
import db from "@/util/db"
import { schema } from "@/util/db"
import { eq } from "drizzle-orm"

export default createMiddleware(({ i }) => {
  const guildOpts = db
    .select()
    .from(schema.guildOptions)
    .where(eq(schema.guildOptions.guildId, i.guild.id))
    .get()
    ?? db
      .insert(schema.guildOptions)
      .values({ guildId: i.guild.id })
      .returning()
      .get()
  return { guildOpts }
})
