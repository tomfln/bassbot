import { Client, type ClientOptions, type Interaction } from "discord.js"
import { MiddlewareBuilder, parseOptions, loadCommandFiles, type CommandContext, type LoadedCommand } from "./command"
import { createAbortHelper, createReplyHelper, mockAbortHelper, mockReplyHelper, replyError } from "./reply"
import { runValidators } from "./validator"
import logger from "./logger"

export interface LoadCommandsOptions {
  /** Depth of directory nesting. 1 = flat, 2 = category/command (default: 2) */
  depth?: 1 | 2
}

/**
 * Base bot class providing the command/middleware/validator framework.
 * Extend this class to create your own bot with custom functionality.
 */
export class Bot<_TThis extends Bot<any> = any> extends Client<true> {
  public commands = new Map<string, LoadedCommand>()

  constructor(opts?: ClientOptions) {
    super(opts ?? { intents: 32767 })
    this.on("interactionCreate", this.handleInteraction.bind(this))
  }

  /**
   * Load command files from a directory.
   * With depth=2 (default), expects category/command.ts structure.
   * With depth=1, expects flat command.ts structure.
   */
  public async loadCommands(dir: string, opts?: LoadCommandsOptions): Promise<void> {
    this.commands = await loadCommandFiles(dir, opts)
    logger.info(`Loaded ${this.commands.size} commands`)
  }

  private async handleInteraction(i: Interaction) {
    const isCommand = i.isChatInputCommand()
    if (!(isCommand || i.isButton()) || !i.inCachedGuild()) return

    const commandId = isCommand ? i.commandName : i.customId.split(":")[0]!
    const command = this.commands.get(commandId)
    if (!command) {
      logger.warn(`Command ${commandId} not found.`)
      return
    }
    if (i.isButton() && !command.sources?.button) {
      logger.warn(`Button interaction for ${command.name} is not allowed.`)
      return
    }

    const ctx: CommandContext<any, any, any> = {
      i,
      bot: this as unknown as CommandContext<any, any, any>["bot"],
      reply: isCommand ? createReplyHelper(i) : mockReplyHelper(i),
      options: isCommand ? parseOptions(i) : undefined,
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

      if (isCommand) {
        await replyError(i, "An internal error occured.")
      }
    }
  }
}
