import { ActivityType, ChatInputCommandInteraction, Client, type Interaction } from "discord.js"
import { Connectors, Shoukaku } from "shoukaku"
import { loadCommands, MiddlewareBuilder, parseOptions, type CommandContext } from "./util/command"
import { PlayerWithQueue } from "./player"
import logger from "./util/logger"
import { createAbortHelper, createReplyHelper, mockAbortHelper, mockReplyHelper, replyError } from "./util/reply"
import nodes from "./nodes"
import { runValidators } from "./util/validator"

export class BassBot extends Client<true> {
  public lava = new Shoukaku(new Connectors.DiscordJS(this), nodes, {
    userAgent: BassBot.name,
    structures: {
      player: PlayerWithQueue as any,
    },
    reconnectTries: 9,
    reconnectInterval: 10,
  })
  public commands!: Awaited<ReturnType<typeof loadCommands>>

  constructor() {
    super({ intents: 32767 })
  }

  private async init() {
    this.commands = await loadCommands()
    logger.info(`Loaded ${this.commands.size} commands`)

    this.on("interactionCreate", this.interactionCreate.bind(this))

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

  private async interactionCreate(i: Interaction) {
    const isCommand = i.isChatInputCommand()
    if (!(isCommand || i.isButton()) || !i.inCachedGuild()) return

    const commandId = isCommand ? i.commandName : i.customId.split(":")[0]!
    const command = this.commands.get(commandId)
    if (!command) {
      logger.warn(`Command ${commandId} not found.`)
      return
    }
    if (i.isButton() && !command.allowButtons) {
      logger.warn(`Button interaction for ${command.name} is not allowed.`)
      return
    }

    const ctx: CommandContext<boolean, any, any> = {
      i,
      bot: this,
      reply: isCommand ? createReplyHelper(i) : mockReplyHelper(i),
      options: isCommand ? parseOptions(i) : {},
      data: {},
    }

    try {
      if (command.validators && !await runValidators(command.validators, ctx)) {
        if (!ctx.i.replied) {
          await ctx.reply.error("You cannot use this command.")
        }
        return
      }

      let aborted = false
      if (command.middleware) {
        const middlewares = command.middleware(new MiddlewareBuilder()).middlewares
        const onAbort = () => (aborted = true)
        
        for (const fn of middlewares) {
          const newData = await fn(ctx, isCommand ? createAbortHelper(i, onAbort) : mockAbortHelper(i, onAbort))
          if (aborted) {
            if (!ctx.i.replied) {
              await ctx.reply.error("You cannot use this commmand.")
            }
            return
          }
          if (newData) ctx.data = { ...ctx.data, ...newData }
        }
      }

      await command.run(ctx)

    } catch (e) {
      logger.error("command runner", "Unhandled Exception in command:")
      logger.debug(e)

      if (isCommand)
        await replyError(i, "An internal error occured. Please contact <@339719840363184138> if the issue persists.")
    }
  }
}
