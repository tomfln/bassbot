import type { APIEmbed, InteractionReplyOptions } from "discord.js"

export const EmbedColor = {
  Error: 0xe25d50,
  Warn: 0xff8f30,
  Success: 0x43b581,
  Info: 0x7289da,
  White90: 0xe6e6e6,
} as const

export function code(msg: unknown) {
  return `\`\`\`${msg}\`\`\``
}

export interface EmbedOpts {
  title?: string
  color?: number
  timestamp?: boolean
  fields?: { name: string; value: string; inline?: boolean }[]
  footer?: { text: string; icon_url?: string }
  flags?: InteractionReplyOptions["flags"]
}

export function createMessageEmbed(msg: string, opts?: EmbedOpts) {
  const embed: APIEmbed = {
    title: opts?.title,
    color: opts?.color,
    description: msg,
    timestamp: opts?.timestamp ? new Date().toISOString() : undefined,

    fields: opts?.fields ?? [],
    footer: opts?.footer,
  }
  return embed
}

export function embedMsg(msg: string, opts?: EmbedOpts) {
  return {
    embeds: [createMessageEmbed(msg, opts)],
  }
}
