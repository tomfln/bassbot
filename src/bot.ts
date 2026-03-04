import { ActivityType, ChatInputCommandInteraction, type ActivityOptions } from "discord.js"
import { Connectors, Shoukaku } from "shoukaku"
import { Bot } from "@lib/bot"
import { PlayerWithQueue } from "./player"
import config from "./config"
import path from "node:path"
import chalk from "chalk"
import db, { schema } from "./util/db"
import { eq } from "drizzle-orm"

const pkg = await Bun.file(path.join(import.meta.dir, "..", "package.json")).json() as { version: string }

// Register BassBot as the bot type for typed ctx.bot in commands
declare module "@lib/command" {
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

  /** Default slogans used when DB has none. */
  private static DEFAULT_SLOGANS = [
    "vibe alert",
    "type /play to start",
    "music 24/7",
    "spotify who?",
    "the best music bot",
    "spürst du die frequenzen?",
  ]

  /** Load bot settings from DB and apply them. */
  private async loadSettings() {
    let row = await db.query.botSettings.findFirst({ where: eq(schema.botSettings.id, 1) })
    if (!row) {
      // Insert defaults
      await db.insert(schema.botSettings).values({ id: 1 }).onConflictDoNothing()
      row = await db.query.botSettings.findFirst({ where: eq(schema.botSettings.id, 1) })
    }
    if (row) {
      this.commandsEnabled = row.commandsEnabled
    }
  }

  private async init() {
    await this.loadSettings()
    const commandDir = path.join(import.meta.dir, "commands")
    await this.loadCommands(commandDir, { depth: 2, silent: true })
    this._syncResult = await this.syncCommands({ token: config.token, clientId: config.appId, silent: true })

    setInterval(() => this.randomActivity(), 1000 * 15)
  }

  /** Persist + apply updated settings. Called by the API. */
  public async updateSettings(patch: Partial<{ commandsEnabled: boolean; slogans: string[] }>) {
    // Row 1 is guaranteed to exist (created by migration + loadSettings).
    // Using .update() instead of insert…onConflictDoUpdate avoids column-name
    // mapping issues where drizzle passes JS property names to SQLite.
    await db
      .update(schema.botSettings)
      .set(patch)
      .where(eq(schema.botSettings.id, 1))

    if (patch.commandsEnabled !== undefined) {
      this.commandsEnabled = patch.commandsEnabled
    }
  }

  /** Read persisted settings. */
  public async getSettings() {
    const row = await db.query.botSettings.findFirst({ where: eq(schema.botSettings.id, 1) })
    return {
      commandsEnabled: row?.commandsEnabled ?? true,
      slogans: (row?.slogans?.length ? row.slogans : BassBot.DEFAULT_SLOGANS),
    }
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
    void this.getSettings().then(({ slogans }) => {
      const list = slogans.length ? slogans : BassBot.DEFAULT_SLOGANS
      const name = list[Math.floor(Math.random() * list.length)]!
      this.user.setActivity({ type: ActivityType.Custom, name } satisfies ActivityOptions)
    })
  }
}
