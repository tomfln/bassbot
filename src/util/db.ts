import env from "@/env"
import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { join } from "node:path"
import * as schema from "./schema"

const dbPath = join(env.DATA_DIR, "data.db")
const sqlite = new Database(dbPath, { create: true })

// Enable WAL mode for better concurrency
sqlite.exec("PRAGMA journal_mode = WAL;")

const db = drizzle(sqlite, { schema })

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS guild_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL UNIQUE,
    channels TEXT NOT NULL DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS saved_queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL UNIQUE,
    queue TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS queue_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    queue TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    guild_id TEXT NOT NULL,
    guild_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    detail TEXT NOT NULL
  );
`)

export type GuildOptions = typeof schema.guildOptions.$inferSelect
export { schema }

export default db
