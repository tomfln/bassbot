import { REST, Routes } from "discord.js"
import type { LoadedCommand } from "./command"
import logger from "./logger"

export interface SyncCommandsOptions {
  /** Discord bot token */
  token: string
  /** Discord application/client ID */
  clientId: string
  /** Optional guild ID — if set, syncs guild-specific commands instead of global */
  guildId?: string
}

export interface SyncResult {
  /** Whether commands were actually pushed to Discord */
  synced: boolean
  /** Human-readable reason */
  reason: string
  /** Number of commands */
  commandCount: number
}

// ─── Serialization ───────────────────────────────────────────────────────────

interface SerializedCommand {
  name: string
  description: string
  description_localizations?: Partial<Record<string, string>>
  options?: any[]
  default_member_permissions?: string | null
  nsfw?: boolean
}

/** Convert a LoadedCommand to the Discord REST API format */
function serializeCommand(cmd: LoadedCommand): SerializedCommand {
  let description: string
  let description_localizations: Partial<Record<string, string>> | undefined

  if (typeof cmd.description === "string") {
    description = cmd.description
  } else {
    const locales = cmd.description
    description = locales["en-US"] ?? Object.values(locales)[0]
    description_localizations = locales
  }

  const serialized: SerializedCommand = { name: cmd.name, description }
  if (description_localizations) serialized.description_localizations = description_localizations
  if (cmd.options?.length) serialized.options = cmd.options
  if (cmd.defaultMemberPermissions != null) {
    serialized.default_member_permissions = String(cmd.defaultMemberPermissions)
  }
  if (cmd.nsfw != null) serialized.nsfw = cmd.nsfw

  return serialized
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Build a simple fingerprint of a command for quick equality checks.
 * Compares: name, description, option names/types/required (recursively).
 */
function commandFingerprint(cmd: { name: string; description: string; options?: any[] }): string {
  const parts = [cmd.name, cmd.description]
  fingerprintOptions(parts, cmd.options, 0)
  return parts.join("\n")
}

function fingerprintOptions(parts: string[], options: any[] | undefined, depth: number) {
  if (!options?.length) return
  const indent = "  ".repeat(depth)
  for (const opt of options) {
    parts.push(`${indent}${opt.name}:${opt.type}:${opt.required ?? false}:${opt.description ?? ""}`)
    // Recurse into sub-options (subcommands/groups)
    if (opt.options) fingerprintOptions(parts, opt.options, depth + 1)
    // Handle choices
    if (opt.choices?.length) {
      for (const c of opt.choices) {
        parts.push(`${indent}  choice:${c.name}:${c.value}`)
      }
    }
  }
}

function commandsMatch(
  local: SerializedCommand[],
  remote: { name: string; description: string; options?: any[] }[],
): boolean {
  if (local.length !== remote.length) return false

  const localMap = new Map(local.map((c) => [c.name, commandFingerprint(c)]))

  for (const r of remote) {
    const localFp = localMap.get(r.name)
    if (!localFp) return false
    if (localFp !== commandFingerprint(r)) return false
  }

  return true
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Sync local commands with Discord.
 * Fetches the currently registered commands, compares them with local commands,
 * and only PUTs when there is a difference. Avoids unnecessary rate-limit usage.
 */
export async function syncCommands(
  commands: Map<string, LoadedCommand>,
  opts: SyncCommandsOptions,
): Promise<SyncResult> {
  const rest = new REST().setToken(opts.token)
  const route = opts.guildId
    ? Routes.applicationGuildCommands(opts.clientId, opts.guildId)
    : Routes.applicationCommands(opts.clientId)

  const local = [...commands.values()].map(serializeCommand)

  try {
    const remote = (await rest.get(route)) as { name: string; description: string; options?: any[] }[]

    if (commandsMatch(local, remote)) {
      return { synced: false, reason: "Commands are already up to date", commandCount: local.length }
    }
  } catch (e) {
    logger.warn(`Could not fetch existing commands, will force-register: ${String(e)}`)
  }

  await rest.put(route, { body: local })
  return { synced: true, reason: "Commands synced with Discord", commandCount: local.length }
}

/**
 * Force-register commands without comparison (always PUTs).
 */
export async function registerCommands(
  commands: Map<string, LoadedCommand>,
  opts: SyncCommandsOptions,
): Promise<void> {
  const rest = new REST().setToken(opts.token)
  const route = opts.guildId
    ? Routes.applicationGuildCommands(opts.clientId, opts.guildId)
    : Routes.applicationCommands(opts.clientId)

  const data = [...commands.values()].map(serializeCommand)
  await rest.put(route, { body: data })
}

/**
 * Clear all commands from Discord (for a guild or globally).
 */
export async function clearCommands(opts: SyncCommandsOptions): Promise<void> {
  const rest = new REST().setToken(opts.token)
  const route = opts.guildId
    ? Routes.applicationGuildCommands(opts.clientId, opts.guildId)
    : Routes.applicationCommands(opts.clientId)

  await rest.put(route, { body: [] })
}
