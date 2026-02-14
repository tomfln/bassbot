import {
  type ApplicationCommandOption,
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  type Awaitable,
  ButtonInteraction,
  ChatInputCommandInteraction,
  type CommandOptionNumericResolvableType,
  ContextMenuCommandInteraction,
  type Permissions,
} from "discord.js"
import fs from "node:fs"
import path from "node:path"
import type { ResolveOptions } from "./option-resolver"
import type { ReplyHelper } from "../reply"
import type { Validator } from "../validator"
import type { MiddlewareFn } from "../middleware"
import type { Flatten } from "../types"
import type { Bot } from "../bot"
import logger from "../logger"

/**
 * Module augmentation interface for registering a custom bot type.
 * Augment this interface in your app code to get typed `ctx.bot`:
 * ```ts
 * declare module "@bot/command" {
 *   interface Register { bot: MyBot }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {}

type RegisteredBot = Register extends { bot: infer B extends Bot<any> } ? B : Bot<any>

export interface AutocompleteContext<
  Options extends ApplicationCommandOption[] = [],
> {
    i: AutocompleteInteraction<"cached">
    bot: RegisteredBot
    options: Partial<ResolveOptions<Options>>
    getFocused: <Full extends boolean = false>(full?: Full) => Full extends true
      ? ExtractAutocompleteOptions<Options>
      : ExtractAutocompleteOptions<Options>["name"]
}

type ExtractAutocompleteOptions<T extends ApplicationCommandOption[]> = {
  [K in keyof T]: T[K] extends { autocomplete: true }
    ? {
        name: T[K]["name"]
        type: T[K]["type"]
        value: T[K]["type"] extends CommandOptionNumericResolvableType
          ? number
          : T[K]["type"] extends ApplicationCommandOptionType.String
          ? string
          : never
      }
    : never
}[number]

export interface CommandContext<
  Sources extends CommandSources = DefaultCommandSources,
  Options extends ApplicationCommandOption[] = [],
  Data extends Record<string, any> = Record<string, never>,
> {
  i: (Sources["command"] extends true ? ChatInputCommandInteraction<"cached"> : never)
    | (Sources["button"] extends true ? ButtonInteraction<"cached"> : never)
    | (Sources["contextMenu"] extends true ? ContextMenuCommandInteraction<"cached"> : never) 
  bot: RegisteredBot
  reply: ReplyHelper
  data: Data,
  options: Sources["command"] extends true 
    ? (Sources["button"] extends true ? ResolveOptions<Options> | undefined : 
       Sources["contextMenu"] extends true ? ResolveOptions<Options> | undefined : 
       ResolveOptions<Options>)
    : undefined
}

export type Locales =
  | "da"
  | "de"
  | "en-GB"
  | "en-US"
  | "es-ES"
  | "es-419"
  | "fr"
  | "hr"
  | "it"
  | "lt"
  | "hu"
  | "nl"
  | "no"
  | "pl"
  | "pt-BR"
  | "ro"
  | "fi"
  | "sv-SE"
  | "vi"
  | "tr"
  | "cs"
  | "el"
  | "bg"
  | "ru"
  | "uk"
  | "hi"
  | "th"
  | "zh-CN"
  | "ja"
  | "zh-TW"
  | "ko"
  
export interface CommandSources {
  command?: boolean
  button?: boolean
  contextMenu?: boolean
}
export interface DefaultCommandSources {
  command: true
}

export interface CommandDefinition<
  Sources extends CommandSources = DefaultCommandSources,
  Options extends ApplicationCommandOption[] = [],
  Data extends Record<string, any> = Record<string, never>,
> {
  name: string
  description: string | Record<Locales, string>
  options?: Options
  defaultMemberPermissions?: Permissions | bigint | number | null | undefined
  nsfw?: boolean
  contexts?: {
    guild?: boolean
    botDm?: boolean
    privateChannel?: boolean
  }
  sources?: Sources
  validators?: Validator[]
  middleware?: (m: MiddlewareBuilder) => MiddlewareBuilder<Data>
  run: (ctx: CommandContext<NoInfer<Sources>, Options, Data>) => Awaitable<unknown>
  autocomplete?: (ctx: AutocompleteContext<Options>) => Awaitable<void>
}
  
type MergeData<A extends Record<string, any>, B extends Record<string, any> | null> = B extends null
  ? A
  : Flatten<A & B>

export class MiddlewareBuilder<
  Data extends Record<string, any> = Record<string, never>,
> {
  middlewares: MiddlewareFn<any>[] = []

  public use<NewData extends Record<string, any>>(fn: MiddlewareFn<NewData>) {
    this.middlewares.push(fn)
    return this as unknown as MiddlewareBuilder<MergeData<Data, NewData>>
  }
}

export type CommandConfig<
  Sources extends CommandSources = DefaultCommandSources,
  Options extends ApplicationCommandOption[] = [],
  Data extends Record<string, any> = Record<string, never>,
> = Omit<CommandDefinition<Sources, Options, Data>, "name">

export const createCommand = <
  Sources extends CommandSources = DefaultCommandSources,
  Options extends ApplicationCommandOption[] = [],
  Data extends Record<string, any> = Record<string, never>,
>(cmd: CommandConfig<Sources, Options, Data>) => cmd

export interface LoadedCommand {
  name: string
  description: string | Record<Locales, string>
  category: string
  options?: ApplicationCommandOption[]
  sources?: CommandSources
  validators?: Validator[]
  middleware?: (m: MiddlewareBuilder) => MiddlewareBuilder<any>
  run: (ctx: CommandContext<any, any, any>) => Awaitable<unknown>
  autocomplete?: (ctx: AutocompleteContext<any>) => Awaitable<void>
  defaultMemberPermissions?: Permissions | bigint | number | null | undefined
  nsfw?: boolean
  contexts?: { guild?: boolean; botDm?: boolean; privateChannel?: boolean }
}

/**
 * Load command files from a directory. Returns a Map of command name → LoadedCommand.
 * With depth=2 (default), expects category/command.ts structure.
 * With depth=1, expects flat command.ts structure.
 */
export async function loadCommandFiles(dir: string, opts?: { depth?: 1 | 2 }): Promise<Map<string, LoadedCommand>> {
  const commands = new Map<string, LoadedCommand>()
  const depth = opts?.depth ?? 2

  if (depth === 2) {
    await Promise.allSettled(
      fs.readdirSync(dir).map(category =>
        fs.readdirSync(`${dir}/${category}`).map(async file => {
          await registerCommandFile(commands, `${dir}/${category}/${file}`, category)
        })
      ).flat()
    )
  } else {
    await Promise.allSettled(
      fs.readdirSync(dir).map(async file => {
        await registerCommandFile(commands, `${dir}/${file}`, "general")
      })
    )
  }

  return commands
}

async function registerCommandFile(commands: Map<string, LoadedCommand>, filePath: string, category: string) {
  const module = await import(filePath) as { default: CommandConfig<any, any, any> }
  const cmd = module.default
  const name = path.basename(filePath).split(".")[0]!
  const valid = !!cmd.description

  if (!valid) return logger.warn(`${category}/${name} is invalid. Missing description.`)
  if (commands.has(name)) return logger.warn(`Command ${category}/${name} is already registered.`)

  commands.set(name, { name, category, ...cmd })
}
