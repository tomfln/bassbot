import env from "@/env"
import StormDB, { FileSaveLocation, JsonFile, type DocType } from "@nlfmt/stormdb"
import { join } from "node:path"
import { z } from "zod"

const models = {
  guildOptions: z.object({
    guildId: z.string(),
    channels: z.array(z.string()).default([]),
  }),
  savedQueues: z.object({
    guildId: z.string(),
    queue: z.object({
      tracks: z.array(z.any()),
      position: z.number(),
      savedAt: z.number(),
    }),
  }),
  queueHistory: z.object({
    guildId: z.string(),
    queue: z.object({
      tracks: z.array(z.any()),
      position: z.number(),
      savedAt: z.number(),
    }),
  }),
  activityLog: z.object({
    timestamp: z.number(),
    guildId: z.string(),
    guildName: z.string(),
    userId: z.string(),
    userName: z.string(),
    action: z.string(),
    detail: z.string(),
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
