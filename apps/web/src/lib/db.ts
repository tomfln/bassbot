import { drizzle } from "drizzle-orm/bun-sqlite"
import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import * as schema from "./schema"
import config from "./config"

const dbPath = config.databasePath

// Ensure parent directory exists
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath, { create: true })
sqlite.run("PRAGMA journal_mode = WAL;")

// Ensure all tables exist (auto-migrate on startup)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" integer DEFAULT false NOT NULL,
    "image" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    "role" text DEFAULT 'user',
    "banned" integer DEFAULT false,
    "ban_reason" text,
    "ban_expires" integer
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email");

  CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expires_at" integer NOT NULL,
    "token" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "impersonated_by" text
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token");

  CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" integer,
    "refresh_token_expires_at" integer,
    "scope" text,
    "password" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" integer NOT NULL,
    "created_at" integer,
    "updated_at" integer
  );

  CREATE TABLE IF NOT EXISTS "web_settings" (
    "key" text PRIMARY KEY NOT NULL,
    "value" text NOT NULL
  );
`)

export const db = drizzle(sqlite, { schema })
export { schema }
export default db
