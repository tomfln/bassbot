import z from "zod"
import { initEnv } from "@bot/init-env"
import { resolve } from "node:path"

const envSchema = z.object({
  TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  W2G_KEY: z.string().min(1),
  DATA_DIR: z.string().default("data")
    .transform(dir => resolve(import.meta.dir, "..", dir)),
  API_PORT: z.coerce.number().default(3001),
  DASHBOARD_ENABLED: z.string().default("true")
    .transform(v => v === "true" || v === "1"),
})

export default initEnv(envSchema)
