import env from "@/env"
import StormDB, { FileSaveLocation, JsonFile, type DocType } from "@nlfmt/stormdb"
import { join } from "node:path"
import { z } from "zod"

const models = {
  guildOptions: z.object({
    guildId: z.string(),
    channels: z.array(z.string()).default([]),
  }),
}

export type GuildOptions = DocType<typeof models.guildOptions>

const dbFile = join(env.DATA_DIR, "db.json")
const storage = new JsonFile(
  new FileSaveLocation(dbFile, {
    createIfNotExists: true,
  })
)

export default StormDB(models, { storage })
