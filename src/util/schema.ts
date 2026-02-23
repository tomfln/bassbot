import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const guildOptions = sqliteTable("guild_options", {
  id: integer().primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull().unique(),
  /** JSON array of channel IDs */
  channels: text({ mode: "json" }).notNull().$type<string[]>().default([]),
})

export const savedQueues = sqliteTable("saved_queues", {
  id: integer().primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull().unique(),
  /** JSON: { tracks: any[], position: number, savedAt: number } */
  queue: text({ mode: "json" })
    .notNull()
    .$type<{ tracks: any[]; position: number; savedAt: number }>(),
})

export const queueHistory = sqliteTable("queue_history", {
  id: integer().primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  /** JSON: { tracks: any[], position: number, savedAt: number } */
  queue: text({ mode: "json" })
    .notNull()
    .$type<{ tracks: any[]; position: number; savedAt: number }>(),
})

/**
 * Single-row table (id=1) for persisted bot settings.
 * commandsEnabled: when false, all slash commands return a maintenance reply.
 * slogans: JSON array of strings shown as rotating activity status.
 */
export const botSettings = sqliteTable("bot_settings", {
  id: integer().primaryKey({ autoIncrement: true }),
  commandsEnabled: integer("commands_enabled", { mode: "boolean" }).notNull().default(true),
  slogans: text({ mode: "json" }).notNull().$type<string[]>().default([
    "vibe alert",
    "type /play to start",
    "music 24/7",
    "spotify who?",
    "the best music bot",
    "spürst du die frequenzen?",
  ]),
})

export const activityLog = sqliteTable("activity_log", {
  id: integer().primaryKey({ autoIncrement: true }),
  timestamp: integer().notNull(),
  guildId: text("guild_id").notNull(),
  guildName: text("guild_name").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatar: text("user_avatar").notNull().default(""),
  action: text().notNull(),
  detail: text().notNull(),
})
