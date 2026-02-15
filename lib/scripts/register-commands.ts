/*
#   Quickly register your slash commands with this script.
#   You can choose to register to the application or only to a specific guild.
#
#   made by nlfmt aka Tom F (https://github.com/nlfmt)
#   MIT License
*/

const USAGE = `Usage: bun register -- [clear | sync] [guild_id]
    clear (optional): Clear all commands from the guild/application.
    sync (optional): Only register if commands differ from Discord (default behavior).
    guild_id (optional): The guild ID to register the commands to. Leave empty for global.`

const log = console.log
const _error = (msg: string) => console.error("\x1b[31m" + msg + "\x1b[0m")
const success = (msg: string) => console.log("\x1b[32m" + msg + "\x1b[0m")

import readline from "node:readline"
import path from "node:path"
import config from "@/config"
import { loadCommandFiles } from "@bot/command"
import { syncCommands, clearCommands } from "@bot/register"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let guildId = process.argv.slice(2).at(0) ?? null

if (guildId && ["help", "--help", "-h"].includes(guildId)) {
  log(USAGE)
  process.exit(0)
}

const mode = guildId === "clear" ? "clear" : guildId === "sync" ? "sync" : "sync"
if (guildId === "clear" || guildId === "sync") {
  guildId = process.argv[3] ?? null
}

const opts = {
  token: config.token,
  clientId: config.clientId,
  ...(guildId && { guildId }),
}

const commandDir = path.join(import.meta.dir, "..", "..", "src", "commands")

if (mode === "clear") {
  rl.question(
    `\x1b[33mAre you sure you want to clear all commands for this ${guildId ? "guild" : "application"}? (y/n)\x1b[0m `,
    async (answer) => {
      if (answer === "y") {
        await clearCommands(opts)
        success(`Successfully cleared ${guildId ? "guild" : "application"} commands.\n`)
      }
      process.exit(0)
    },
  )
} else {
  const commands = await loadCommandFiles(commandDir, { depth: 2 })
  const result = await syncCommands(commands, opts)

  if (result.synced) {
    success(`Synced ${result.commandCount} ${guildId ? "guild" : "application"} command(s).\n`)
  } else {
    log(`Commands already up to date (${result.commandCount} commands). No changes needed.\n`)
  }
  process.exit(0)
}
