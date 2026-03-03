import { resolve, join } from "node:path"
import { existsSync, readFileSync } from "node:fs"

// ── Resolve data directory (env-only, needed to locate config.json) ──

const dataDir = resolve(
  process.env.DATA_DIR ?? join(process.cwd(), "..", "data"),
)

// ── Load config.json ──

let file: Record<string, unknown> = {}
try {
  const configPath = join(dataDir, "config.json")
  if (existsSync(configPath)) {
    file = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>
  }
} catch { /* config.json not found or invalid — env vars will be used */ }

// ── Merge: config.json defaults, env vars override ──

function str(envKey: string, fileKey: string): string | undefined {
  return (process.env[envKey] ?? file[fileKey]) as string | undefined
}

const config = {
  /** Discord application ID (shared between bot and web, also used as OAuth client ID) */
  appId: str("DISCORD_APP_ID", "appId") ?? "",
  /** Discord OAuth client secret (web only) */
  discordOauthSecret: str("DISCORD_OAUTH_CLIENT_SECRET", "discordOauthSecret") ?? "",
  /** Shared JWT secret for auth between bot and web */
  jwtSecret: str("JWT_SECRET", "jwtSecret") ?? "",
  /** BetterAuth encryption secret */
  betterAuthSecret: str("BETTER_AUTH_SECRET", "betterAuthSecret") ?? "",
  /** Public URL of the web app (for OAuth callbacks) */
  betterAuthUrl: str("BETTER_AUTH_URL", "betterAuthUrl") ?? "http://localhost:3000",
  /** Bot API base URL for browser calls (empty = same-origin, set only when bot API is on a different domain) */
  apiUrl: str("API_URL", "apiUrl") ?? "",
  /** SQLite database path */
  databasePath: str("DATABASE_PATH", "databasePath") ?? join(dataDir, "web.db"),
  /** Raw data directory path */
  dataDir,
}

// ── Validate required fields at startup (warn only — Next.js build has no config) ──

const isBuild = process.argv.some(a => a.includes("next") && process.argv.includes("build"))

if (!isBuild) {
  const missing: string[] = []
  if (!config.appId) missing.push("appId / DISCORD_APP_ID")
  if (!config.discordOauthSecret) missing.push("discordOauthSecret / DISCORD_OAUTH_CLIENT_SECRET")
  if (!config.jwtSecret) missing.push("jwtSecret / JWT_SECRET")
  if (!config.betterAuthSecret) missing.push("betterAuthSecret / BETTER_AUTH_SECRET")

  if (missing.length > 0) {
    console.error("\n❌ Missing web configuration:")
    for (const key of missing) {
      console.error(` - ${key}: required but not set`)
    }
    console.error("\nSet values in config.json or as environment variables.\n")
  }
}

// ── Inject env vars that BetterAuth reads automatically ──
// BetterAuth reads BETTER_AUTH_SECRET and BETTER_AUTH_URL from process.env
// so we ensure they're set from our unified config.

if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = config.betterAuthSecret
}
if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = config.betterAuthUrl
}

export default config
