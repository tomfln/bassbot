import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIEmbed,
  type InteractionReplyOptions,
  type MessageCreateOptions,
} from "discord.js"
import { type Track } from "shoukaku"
import { cleanTrackTitle } from "./helpers"
import { AppEmoji } from "@/constants/emojis"

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

export function nowPlayingButtons(paused: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("prev").setEmoji(AppEmoji.prev).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("pause")
      .setStyle(ButtonStyle.Primary)
      .setEmoji({ id: paused ? AppEmoji.play: AppEmoji.pause}),
    new ButtonBuilder().setCustomId("next").setEmoji(AppEmoji.next).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("queue").setLabel("Queue").setStyle(ButtonStyle.Secondary)
  )
}

export function nowPlayingMessage(track: Track) {
  const title = cleanTrackTitle(track)
  const padChar = "\u00A0"
  const padLength = 47 - Math.floor(1.8 * title.length)
  const padding = `${padLength > 0 ? padChar.repeat(padLength) : ""}${padLength > -5 ? AppEmoji.string("spacer") : ""}`
  const embed = new EmbedBuilder()
    .setAuthor({ name: "Now Playing" })
    .setDescription(`[${title}](${track.info.uri})${padding}\nby ${track.info.author}\n`)
    .setThumbnail(track.info.artworkUrl ?? null)
    .setColor(EmbedColor.White90)

  const row = nowPlayingButtons(false)

  return {
    embeds: [embed],
    components: [row],
    flags: "SuppressNotifications",
  } satisfies MessageCreateOptions
}
