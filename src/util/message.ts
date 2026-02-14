import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type MessageCreateOptions,
} from "discord.js"
import { type Track } from "shoukaku"
import { cleanTrackTitle } from "./helpers"
import { AppEmoji } from "@/constants/emojis"
import { EmbedColor } from "@bot/message"

// Re-export generic message helpers for convenience
export { EmbedColor, code, createMessageEmbed, embedMsg, type EmbedOpts } from "@bot/message"

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
