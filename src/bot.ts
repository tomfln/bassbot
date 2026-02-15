import { ActivityType, ChatInputCommandInteraction } from "discord.js"
import { Connectors, Shoukaku } from "shoukaku"
import { Bot } from "@bot/bot"
import { PlayerWithQueue } from "./player"
import config from "./config"
import path from "node:path"
import chalk from "chalk"

const pkg = await Bun.file(path.join(import.meta.dir, "..", "package.json")).json() as { version: string }

// Register BassBot as the bot type for typed ctx.bot in commands
declare module "@bot/command" {
  interface Register {
    bot: BassBot
  }
}

export class BassBot extends Bot<BassBot> {
  public lava = new Shoukaku(new Connectors.DiscordJS(this), config.nodes, {
    userAgent: BassBot.name,
    structures: {
      player: PlayerWithQueue as any,
    },
    reconnectTries: 9,
    reconnectInterval: 10,
  })

  constructor() {
    super({ intents: 32767 })
  }

  private _syncResult: { synced: boolean; commandCount: number } | null = null

  private async init() {
    const commandDir = path.join(import.meta.dir, "commands")
    await this.loadCommands(commandDir, { depth: 2, silent: true })
    this._syncResult = await this.syncCommands({ token: config.token, clientId: config.clientId, silent: true })

    setInterval(() => this.randomActivity(), 1000 * 15)
  }

  public async login(token?: string) {
    await this.init()
    return super.login(token)
  }

  public getPlayer(guildId: string) {
    return this.lava.players.get(guildId) as PlayerWithQueue | undefined
  }

  public async joinVC(i: ChatInputCommandInteraction<"cached">) {
    const player = await this.lava.joinVoiceChannel({
      guildId: i.guildId,
      channelId: i.member.voice.channelId!,
      shardId: 0,
      deaf: true,
    }) as PlayerWithQueue
    
    player.init(this, i)
    return player
  }
  
  public async getOrCreatePlayer(i: ChatInputCommandInteraction<"cached">) {
    const player = this.getPlayer(i.guildId)
    if (player) return player

    return this.joinVC(i)
  }

  public async leaveVC(guildId: string) {
    return this.lava.leaveVoiceChannel(guildId)
  }

  public printBanner(username: string) {
    const sync = this._syncResult!
    const banner = chalk.cyan(`
 _                   _           _
| |__   __ _ ___ ___| |__   ___ | |_
| '_ \\ / _\` / __/ __| '_ \\ / _ \\| __|
| |_) | (_| \\__ \\__ \\ |_) | (_) | |_
|_.__/ \\__,_|___/___/_.__/ \\___/ \\__|
`)
    const dim = chalk.dim
    const label = chalk.white.bold
    const val = chalk.greenBright
    const sep = dim("─".repeat(42))

    const lavalinkNodes = config.nodes.map((n) => n.name).join(", ")
    const commandsSynced = sync.synced
      ? chalk.yellowBright(`synced ${sync.commandCount} commands`)
      : val(`${sync.commandCount} commands (up to date)`)

    const lines = [
      banner,
      sep,
      `  ${label("Version")}      ${val(`v${pkg.version}`)}`,
      `  ${label("Bot")}          ${val(username)}`,
      `  ${label("Commands")}     ${commandsSynced}`,
      `  ${label("Lavalink")}     ${val(lavalinkNodes)}`,
      `  ${label("Runtime")}      ${val(`Bun v${Bun.version}`)}`,
      sep,
      "",
    ]

    console.log(lines.join("\n"))
  }

  public randomActivity() {
    const activities = [
      { type: ActivityType.Listening, name: "/help" },
      { type: ActivityType.Listening, name: "/play" },
      { type: ActivityType.Playing, name: "music" },
      { type: ActivityType.Playing, name: `in ${this.guilds.cache.size} servers` },
    ]
    const activity = activities[Math.floor(Math.random() * activities.length)]
    this.user.setActivity(activity) 
  }
}
