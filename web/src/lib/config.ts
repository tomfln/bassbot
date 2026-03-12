import { z } from "zod"
import { resolve, join } from "node:path"
import { parseEnv } from "@lib/init-env"
import { PHASE_PRODUCTION_BUILD } from "next/dist/shared/lib/constants"

// During `next build` env vars aren't available — skip validation
const isBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD

const envSchema = z.object({
  DISCORD_APP_ID: z.string().min(1),
  DISCORD_OAUTH_CLIENT_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  WEB_BASE_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default(""),
  DATABASE_PATH: z.string().default(""),
  DATA_DIR: z.string().default(""),
  ADMIN_USERS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
})

const env = isBuild
  ? (envSchema.partial().parse({}) as z.infer<typeof envSchema>)
  : parseEnv(process.env, envSchema)

const dataDir = env.DATA_DIR
  ? resolve(env.DATA_DIR)
  : resolve(join(process.cwd(), "..", "data"))

const config = {
  appId: env.DISCORD_APP_ID ?? "",
  discordOauthSecret: env.DISCORD_OAUTH_CLIENT_SECRET ?? "",
  jwtSecret: env.JWT_SECRET ?? "",
  betterAuthSecret: env.BETTER_AUTH_SECRET ?? "",
  webBaseUrl: env.WEB_BASE_URL ?? "http://localhost:3000",
  apiUrl: env.API_URL ?? "",
  databasePath: env.DATABASE_PATH || join(dataDir, "web.db"),
  adminUsers: env.ADMIN_USERS ?? [],
  dataDir,
}

// BetterAuth reads BETTER_AUTH_SECRET from process.env
if (config.betterAuthSecret && !process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = config.betterAuthSecret
}

export default config
