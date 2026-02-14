/*
#   Quickly register your slash commands with this script.
#   You can choose to register to the application or only to a specific guild.
#
#   made by nlfmt aka Tom F (https://github.com/nlfmt)
#   MIT License
*/

const USAGE = `Usage: bun register -- [clear] [guild_id]
    clear (optional): If specified, will clear the commands from the guild/application.
    guild_id (optional): The guild ID to register the commands to. Leave empty to register to the application.`

const log = console.log
const error = (msg: string) => console.error("\x1b[31m" + msg + "\x1b[0m")
const success = (msg: string) => console.log("\x1b[32m" + msg + "\x1b[0m")

import { REST, Routes } from "discord.js"
import readline from "node:readline"
import env from "../src/env"
import { loadCommandFiles, type LoadedCommand } from "@bot/command"
import path from "node:path"

// Setup user confirmation prompt
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let guildId = process.argv.slice(2).at(0) ?? null

if (guildId && ["help", "--help", "-h"].includes(guildId)) {
  log(USAGE)
  process.exit(0)
}

const clear = guildId === "clear"
if (clear) {
  guildId = process.argv[3] ?? null
}

const rest = new REST().setToken(env.TOKEN)
const ROUTE = guildId
  ? Routes.applicationGuildCommands(env.CLIENT_ID, guildId)
  : Routes.applicationCommands(env.CLIENT_ID)

function register(commands: Map<string, LoadedCommand>) {
  const data = [...commands.values()].map((cmd) => ({
    name: cmd.name,
    description: cmd.description,
    options: cmd.options,
  }))

  rest
    .put(ROUTE, { body: data })
    .then(() => {
      success(`Successfully registered ${commands.size} ${guildId ? "guild" : "application"} command(s).\n`)
      process.exit(0)
    })
    .catch(error)
}

// Prompt for confirmation before clearing
if (clear) {
  rl.question(
    `\x1b[33mAre you sure you want to clear all commands for this ${guildId ? "guild" : "application"}? (y/n)\x1b[0m `,
    (answer) => {
      if (answer == "y") register(new Map())
      else process.exit(0)
    }
  )
} else {
  const commandDir = path.join(import.meta.dir, "..", "src", "commands")
  register(await loadCommandFiles(commandDir, { depth: 2 }))
}
