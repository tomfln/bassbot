import { ActivityType, ChatInputCommandInteraction } from "discord.js"
import { Connectors, Shoukaku } from "shoukaku"
import { Bot } from "@bot/bot"
import { PlayerWithQueue } from "./player"
import nodes from "./nodes"
import env from "./env"
import path from "node:path"

// Register BassBot as the bot type for typed ctx.bot in commands
declare module "@bot/command" {
  interface Register {
    bot: BassBot
  }
}

export class BassBot extends Bot<BassBot> {
  public lava = new Shoukaku(new Connectors.DiscordJS(this), nodes, {
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

  private async init() {
    const commandDir = path.join(import.meta.dir, "commands")
    await this.loadCommands(commandDir, { depth: 2 })

    // Auto-sync commands with Discord (only pushes when changed)
    await this.syncCommands({ token: env.TOKEN, clientId: env.CLIENT_ID })

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
    
    await player.init(this, i)
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
