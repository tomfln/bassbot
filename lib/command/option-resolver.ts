import {
  ChatInputCommandInteraction,
  ApplicationCommandOptionType as OptionType,
  type ApplicationCommandOption,
  type ApplicationCommandSubCommand,
  type ApplicationCommandSubGroup,
  type CommandInteractionOption,
} from "discord.js"
import type { Flatten } from "../types"

type ResolveOptionType<O extends ApplicationCommandOption, T = O["type"]> = ReturnType<
  ChatInputCommandInteraction["options"][T extends OptionType.String
    ? "getString"
    : T extends OptionType.Integer
    ? "getInteger"
    : T extends OptionType.Boolean
    ? "getBoolean"
    : T extends OptionType.User
    ? "getUser"
    : T extends OptionType.Channel
    ? "getChannel"
    : T extends OptionType.Role
    ? "getRole"
    : T extends OptionType.Mentionable
    ? "getMentionable"
    : T extends OptionType.Number
    ? "getNumber"
    : T extends OptionType.Attachment
    ? "getAttachment"
    : never]
>

type SubCommandOptionType = ApplicationCommandSubCommand | ApplicationCommandSubGroup
type SimpleOptionType = Exclude<ApplicationCommandOption, SubCommandOptionType>

type OptionValueType<O extends SimpleOptionType> = O["required"] extends true
  ? NonNullable<ResolveOptionType<O>>
  : ResolveOptionType<O>

type MixedOptionsErr =
  "Mixed options are not supported. Please use either all simple options or all subcommands/subcommand groups."

// Transform array of option objects to object with option names as keys
type _ResolveOptions<Options extends readonly SimpleOptionType[] | undefined> =
  Options extends readonly SimpleOptionType[]
    ? {
        [Name in Options[number]["name"]]: Extract<Options[number], { name: Name }> extends infer O
          ? O extends SimpleOptionType
            ? OptionValueType<O>
            : never
          : never
      }
    : never

type _ResolveSubOptions<
  Options extends readonly SubCommandOptionType[],
  Group extends Record<string, string> = Record<string, never>
> = Options extends [infer SubCommand, ...infer Rest]
  ? SubCommand extends ApplicationCommandSubCommand
    ? Rest extends SubCommandOptionType[]
      ? SubCommand["options"] extends ApplicationCommandSubCommand["options"]
        ?
            | Flatten<_ResolveOptions<SubCommand["options"]> & Group & { __cmd: SubCommand["name"] }>
            | _ResolveSubOptions<Rest>
        : Flatten<Group & { __cmd: SubCommand["name"] }> | _ResolveSubOptions<Rest, Group>
      : MixedOptionsErr
    : SubCommand extends ApplicationCommandSubGroup
    ? Rest extends SubCommandOptionType[]
      ? SubCommand["options"] extends SubCommandOptionType[]
        ? _ResolveSubOptions<SubCommand["options"], { __group: SubCommand["name"] }> | _ResolveSubOptions<Rest>
        : _ResolveSubOptions<Rest>
      : MixedOptionsErr
    : never
  : never

/**
 * Resolves an array of options into an object with option names as keys
 * 1. Check if Options only contains "simple" options (not subcommands or groups)
 * 2. If it does resolve the options object, done
 * 3. If the option is a subcommand or group, call ResolveSubOptions on the whole options object
 * 3. If the option is a subcommand, resolve its options object, and OR it with the rest of the options
 * 4. If the option is a subcommand group, throw its options into ResolveSubOptions and OR it with the rest of the options
 */
export type ResolveOptions<Options extends readonly ApplicationCommandOption[]> =
  Options extends readonly SimpleOptionType[]
    ? _ResolveOptions<Options>
    : Options extends readonly SubCommandOptionType[]
    ? _ResolveSubOptions<Options>
    : MixedOptionsErr

export function parseOptions(i: ChatInputCommandInteraction) {
  const parsed = {} as Record<string, any>
  _parseOptions(parsed, i.options.data)
  return parsed
}

function _parseOptions(parsed: Record<string, any>, options: readonly CommandInteractionOption[] | undefined) {
  if (!options) return parsed
  for (const option of options) {
    if (option.type === OptionType.Subcommand) {
      parsed.__cmd = option.name
      _parseOptions(parsed, option.options)
    } else if (option.type === OptionType.SubcommandGroup) {
      parsed.__group = option.name
      _parseOptions(parsed, option.options)
    } else {
      parsed[option.name] = getOptionValue(option)
    }
  }
}

function getOptionValue(option: CommandInteractionOption) {
  switch (option.type) {
    case OptionType.String:
    case OptionType.Integer:
    case OptionType.Boolean:
    case OptionType.Number:
      return option.value

    case OptionType.User:
      return option.user
    case OptionType.Channel:
      return option.channel
    case OptionType.Role:
      return option.role
    case OptionType.Mentionable:
      return option.role ?? option.user
    case OptionType.Attachment:
      return option.attachment
  }
}
