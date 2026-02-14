import z from "zod"
import { initEnv } from "@bot/init-env"
import { resolve } from "node:path"

const envSchema = z.object({
  TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  W2G_KEY: z.string().min(1),
  DATA_DIR: z.string().default("./")
    .transform(dir => resolve(import.meta.dir, "..", dir)),
})

export default initEnv(envSchema)
