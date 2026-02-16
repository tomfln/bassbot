import db from "./db"
import { schema } from "./db"
import { eq, asc, desc, inArray } from "drizzle-orm"
import { broadcast } from "./broadcast"
import { cache } from "./api-cache"
import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js"

export interface ActivityEntry {
  timestamp: number
  guildId: string
  guildName: string
  userId: string
  userName: string
  userAvatar: string
  action: string
  detail: string
}

const MAX_PER_GUILD = 100
const MAX_GLOBAL = 200

/**
 * Log an activity entry. Persists to the DB, broadcasts via WebSocket,
 * invalidates log caches, and maintains size limits.
 */
export function logActivity(entry: Omit<ActivityEntry, "timestamp">) {
  const full: ActivityEntry = { ...entry, timestamp: Date.now() }

  db.insert(schema.activityLog).values(full).run()

  // Push to all connected dashboards
  broadcast("log:new", full)

  // Invalidate cached log responses
  cache.invalidate("logs:")

  // Prune guild-specific log
  const guildLog = db
    .select({ id: schema.activityLog.id })
    .from(schema.activityLog)
    .where(eq(schema.activityLog.guildId, entry.guildId))
    .orderBy(asc(schema.activityLog.timestamp))
    .all()
  if (guildLog.length > MAX_PER_GUILD) {
    const toRemove = guildLog.slice(0, guildLog.length - MAX_PER_GUILD)
    db.delete(schema.activityLog)
      .where(inArray(schema.activityLog.id, toRemove.map(r => r.id)))
      .run()
  }

  // Enforce global limit
  const allIds = db
    .select({ id: schema.activityLog.id })
    .from(schema.activityLog)
    .orderBy(asc(schema.activityLog.timestamp))
    .all()
  if (allIds.length > MAX_GLOBAL) {
    const toRemove = allIds.slice(0, allIds.length - MAX_GLOBAL)
    db.delete(schema.activityLog)
      .where(inArray(schema.activityLog.id, toRemove.map(r => r.id)))
      .run()
  }
}

/**
 * Get activity log for a specific guild, newest first.
 */
export function getGuildLog(guildId: string, limit = 50): ActivityEntry[] {
  return db
    .select()
    .from(schema.activityLog)
    .where(eq(schema.activityLog.guildId, guildId))
    .orderBy(desc(schema.activityLog.timestamp))
    .limit(limit)
    .all()
}

/**
 * Get global activity log, newest first.
 */
export function getGlobalLog(limit = 50): ActivityEntry[] {
  return db
    .select()
    .from(schema.activityLog)
    .orderBy(desc(schema.activityLog.timestamp))
    .limit(limit)
    .all()
}

type LoggableInteraction =
  | ChatInputCommandInteraction<"cached">
  | ButtonInteraction<"cached">

/**
 * Shorthand: log from a guild interaction context.
 */
export function log(
  i: LoggableInteraction,
  action: string,
  detail: string,
) {
  logActivity({
    guildId: i.guildId,
    guildName: i.guild.name,
    userId: i.user.id,
    userName: i.member.displayName,
    userAvatar: i.user.displayAvatarURL({ size: 64 }),
    action,
    detail,
  })
}
