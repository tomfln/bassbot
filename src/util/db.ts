import config from "@/config"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { Database } from "bun:sqlite"
import { join } from "node:path"
import { mkdirSync } from "node:fs"
import * as schema from "./schema"
import logger from "@bot/logger"

// Ensure the data directory exists before opening the database
mkdirSync(config.dataDir, { recursive: true })

const dbPath = join(config.dataDir, "data.db")
const sqlite = new Database(dbPath, { create: true })

// Enable WAL mode for better concurrency
sqlite.run("PRAGMA journal_mode = WAL;")

const db = drizzle(sqlite, { schema })

// Run migrations on startup
const migrationsFolder = join(import.meta.dir, "..", "..", "drizzle")
try {
  migrate(db, { migrationsFolder })
  logger.info("Database migrations applied successfully")
} catch (e) {
  logger.error("db", `Migration failed: ${e}`)
  throw e
}

export type GuildOptions = typeof schema.guildOptions.$inferSelect
export { schema }

export default db
