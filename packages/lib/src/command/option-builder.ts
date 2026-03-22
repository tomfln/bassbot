import {
  type ApplicationCommandOption,
  type ApplicationCommandStringOption,
  type ApplicationCommandNumericOption,
  type ApplicationCommandBooleanOption,
  type ApplicationCommandUserOption,
  type ApplicationCommandChannelOption,
  type ApplicationCommandRoleOption,
  type ApplicationCommandMentionableOption,
  type ApplicationCommandAttachmentOption,
  type ApplicationCommandSubCommand,
  type ApplicationCommandSubGroup,
  ApplicationCommandOptionType as OptionType,
} from "discord.js"
import type { Flatten } from "../types"

type ValidateOption<T> = T extends ApplicationCommandOption ? T : never

type SubCommandKeys = "subcommand" | "group"
type RemoveDisallowed<Builder extends OptionBuilder<any>, Subcommand extends boolean> = Subcommand extends true
  ? Pick<Builder, "build" | SubCommandKeys>
  : Omit<Builder, SubCommandKeys>

type AddOptionFn<
  Option extends ApplicationCommandOption,
  Options extends ApplicationCommandOption[],
  Subcommand extends boolean = false
> = <N extends string, O extends Omit<Option, "type" | "name">>(
  option: { name: N } & O
) => RemoveDisallowed<
  OptionBuilder<[...Options, ValidateOption<Flatten<O & { name: N; type: Option["type"] }>>]>,
  Subcommand
>

export type OptionBuilder<Options extends ApplicationCommandOption[] = []> = Flatten<{
  string: AddOptionFn<ApplicationCommandStringOption, Options>
  integer: AddOptionFn<ApplicationCommandNumericOption, Options>
  number: AddOptionFn<ApplicationCommandNumericOption, Options>
  boolean: AddOptionFn<ApplicationCommandBooleanOption, Options>
  user: AddOptionFn<ApplicationCommandUserOption, Options>
  channel: AddOptionFn<ApplicationCommandChannelOption, Options>
  role: AddOptionFn<ApplicationCommandRoleOption, Options>
  mentionable: AddOptionFn<ApplicationCommandMentionableOption, Options>
  attachment: AddOptionFn<ApplicationCommandAttachmentOption, Options>
  subcommand: AddOptionFn<ApplicationCommandSubCommand, Options, true>
  group: AddOptionFn<ApplicationCommandSubGroup, Options, true>
  build: () => Options
}>

const OptionTypeMap = {
  string: OptionType.String,
  integer: OptionType.Integer,
  number: OptionType.Number,
  boolean: OptionType.Boolean,
  user: OptionType.User,
  channel: OptionType.Channel,
  role: OptionType.Role,
  mentionable: OptionType.Mentionable,
  attachment: OptionType.Attachment,
  subcommand: OptionType.Subcommand,
  group: OptionType.SubcommandGroup,
} as const

export const buildOptions = () =>
  new Proxy([], {
    get(opts: any[], type: keyof OptionBuilder, proxy) {
      return type === "build"
        ? () => opts
        : (option: any) => {
            opts.push({ ...option, type: OptionTypeMap[type] })
            return proxy
          }
    },
  }) as unknown as OptionBuilder
