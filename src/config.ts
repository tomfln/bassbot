import { z } from "zod"
import { resolve, join } from "node:path"
import { existsSync, readFileSync } from "node:fs"
import { parseEnv } from "@lib/init-env"

// ── Env schema ──

const envSchema = z.object({
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_APP_ID: z.string().min(1),
  W2G_KEY: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  DATA_DIR: z.string().default(""),
  API_PORT: z.coerce.number().default(3001),
  API_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  WEB_BASE_URL: z.string().min(1),
  // Primary lavalink node via env (LAVALINK_HOST, LAVALINK_PASSWORD, LAVALINK_NAME)
  LAVALINK_HOST: z.string().optional(),
  LAVALINK_PASSWORD: z.string().optional(),
  LAVALINK_NAME: z.string().optional(),
  LAVALINK_SECURE: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((v) => v === "true" || v === "1"),
})

const env = parseEnv(process.env, envSchema)

// ── Resolve data directory ──

const dataDir = env.DATA_DIR
  ? resolve(env.DATA_DIR)
  : resolve(join(import.meta.dir, "..", "data"))

// ── Lavalink nodes ──

interface LavalinkNode {
  name: string
  url: string
  auth: string
  secure?: boolean
}

function loadNodes(): LavalinkNode[] {
  const nodes: LavalinkNode[] = []

  // 1. Primary node from env
  if (env.LAVALINK_HOST && env.LAVALINK_PASSWORD) {
    nodes.push({
      name: env.LAVALINK_NAME ?? "main",
      url: env.LAVALINK_HOST,
      auth: env.LAVALINK_PASSWORD,
      secure: env.LAVALINK_SECURE,
    })
  }

  // 2. Extra nodes from LAVALINK_HOST_1, LAVALINK_PASSWORD_1, etc.
  for (let i = 1; i <= 10; i++) {
    const host = process.env[`LAVALINK_HOST_${i}`]
    const password = process.env[`LAVALINK_PASSWORD_${i}`]
    if (!host || !password) break
    nodes.push({
      name: process.env[`LAVALINK_NAME_${i}`] ?? `node${i}`,
      url: host,
      auth: password,
      secure: process.env[`LAVALINK_SECURE_${i}`] === "true",
    })
  }

  // 3. Fall back to nodes.json in data dir
  if (nodes.length === 0) {
    try {
      const nodesPath = join(dataDir, "nodes.json")
      if (existsSync(nodesPath)) {
        const parsed = JSON.parse(readFileSync(nodesPath, "utf-8"))
        if (Array.isArray(parsed)) return parsed as LavalinkNode[]
      }
    } catch { /* ignore */ }
  }

  return nodes
}

// ── Export ──

const config = {
  token: env.DISCORD_BOT_TOKEN,
  appId: env.DISCORD_APP_ID,
  w2gKey: env.W2G_KEY ?? "",
  jwtSecret: env.JWT_SECRET,
  dataDir,
  apiPort: env.API_PORT,
  apiEnabled: env.API_ENABLED,
  nodes: loadNodes(),
  webBaseUrl: env.WEB_BASE_URL,
}

export default config
