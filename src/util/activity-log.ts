import db from "./db"
import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js"

export interface ActivityEntry {
  timestamp: number
  guildId: string
  guildName: string
  userId: string
  userName: string
  action: string
  detail: string
}

const MAX_PER_GUILD = 100
const MAX_GLOBAL = 200

/**
 * Log an activity entry. Persists to the DB and maintains size limits.
 */
export async function logActivity(entry: Omit<ActivityEntry, "timestamp">) {
  const full: ActivityEntry = { ...entry, timestamp: Date.now() }

  // Save guild-specific log
  const guildLog = await db.activityLog.findMany({ guildId: entry.guildId })
  if (guildLog.length >= MAX_PER_GUILD) {
    const sorted = guildLog.sort((a, b) => a.timestamp - b.timestamp)
    const toRemove = sorted.slice(0, guildLog.length - MAX_PER_GUILD + 1)
    for (const old of toRemove) {
      await db.activityLog.deleteById(old._id)
    }
  }

  await db.activityLog.create(full)

  // Enforce global limit
  const all = await db.activityLog.findMany({})
  if (all.length > MAX_GLOBAL) {
    const sorted = all.sort((a, b) => a.timestamp - b.timestamp)
    const toRemove = sorted.slice(0, all.length - MAX_GLOBAL)
    for (const old of toRemove) {
      await db.activityLog.deleteById(old._id)
    }
  }
}

/**
 * Get activity log for a specific guild, newest first.
 */
export async function getGuildLog(guildId: string, limit = 50): Promise<ActivityEntry[]> {
  const entries = await db.activityLog.findMany({ guildId })
  return entries
    .sort((a: ActivityEntry, b: ActivityEntry) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

/**
 * Get global activity log, newest first.
 */
export async function getGlobalLog(limit = 50): Promise<ActivityEntry[]> {
  const entries = await db.activityLog.findMany({})
  return entries
    .sort((a: ActivityEntry, b: ActivityEntry) => b.timestamp - a.timestamp)
    .slice(0, limit)
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
  void logActivity({
    guildId: i.guildId,
    guildName: i.guild.name,
    userId: i.user.id,
    userName: i.member.displayName,
    action,
    detail,
  })
}
