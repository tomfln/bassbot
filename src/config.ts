import { z } from "zod"
import { resolve, join } from "node:path"
import { existsSync, readFileSync } from "node:fs"

// ── Resolve data directory (env-only, needed to locate config.json) ──

const dataDir = resolve(
  process.env.DATA_DIR ?? join(import.meta.dir, "..", "data"),
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

const raw = {
  token: process.env.TOKEN ?? file.token,
  clientId: process.env.CLIENT_ID ?? file.clientId,
  w2gKey: process.env.W2G_KEY ?? file.w2gKey,
  dataDir,
  apiPort:
    process.env.API_PORT != null
      ? Number(process.env.API_PORT)
      : (file.apiPort ?? 3001),
  dashboardEnabled:
    process.env.DASHBOARD_ENABLED != null
      ? process.env.DASHBOARD_ENABLED === "true" || process.env.DASHBOARD_ENABLED === "1"
      : (file.dashboardEnabled ?? true),
  nodes: file.nodes ?? [],
}

// ── Validate ──

const configSchema = z.object({
  token: z.string().min(1),
  clientId: z.string().min(1),
  w2gKey: z.string().min(1),
  dataDir: z.string(),
  apiPort: z.number().default(3001),
  dashboardEnabled: z.boolean().default(true),
  nodes: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        auth: z.string(),
        secure: z.boolean().optional(),
        group: z.string().optional(),
      }),
    )
    .default([]),
})

const result = configSchema.safeParse(raw)

if (!result.success) {
  console.error("\n❌ Invalid configuration:")
  for (const [key, errors] of Object.entries(
    result.error.flatten().fieldErrors,
  )) {
    console.error(` - ${key}: ${errors}`)
  }
  console.error("\nSet values in config.json or as environment variables.\n")
  process.exit(1)
}

export default result.data
