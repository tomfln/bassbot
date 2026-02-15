import { createCommand } from "@bot/command"
import { cleanTrackTitle } from "@/util/helpers"
import { duration } from "@/util/time"
import { Queue } from "@/queue"
import isBoundChannel from "@/validators/isBoundChannel"
import isInGuild from "@/validators/isInGuild"
import isInVC from "@/validators/isInVC"
import { createMessageEmbed, EmbedColor } from "@bot/message"
import { log } from "@/util/activity-log"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  time,
  TimestampStyles,
} from "discord.js"

function abbreviate(str: string, maxLen: number) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str
}

export default createCommand({
  description: "Load a recently played queue",

  validators: [isBoundChannel(), isInGuild(), isInVC()],

  run: async ({ i, reply, bot }) => {
    const entries = await Queue.getHistory(i.guildId)

    if (entries.length === 0) {
      return reply("No recent queues found.")
    }

    // Build select menu with up to 25 entries
    const menuEntries = entries.slice(0, 25)
    const select = new StringSelectMenuBuilder()
      .setCustomId("loadqueue-select")
      .setPlaceholder("Select a queue to load...")
      .addOptions(
        menuEntries.map((entry, idx) => {
          const q = entry.queue
          const trackCount = q.tracks.length
          const totalDuration = duration(
            q.tracks.reduce((a, t) => a + (t.info?.length ?? 0), 0) / 1000,
          )
          const preview = q.tracks
            .slice(0, 3)
            .map((t) => cleanTrackTitle(t))
            .join(", ")

          return new StringSelectMenuOptionBuilder()
            .setLabel(
              abbreviate(
                `${trackCount} track${trackCount !== 1 ? "s" : ""}, ${totalDuration}`,
                100,
              ),
            )
            .setValue(idx.toString())
            .setDescription(
              abbreviate(preview || "Empty queue", 100),
            )
        }),
      )

    const selectRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)

    const response = await i.reply({
      embeds: [createMessageEmbed("Select a queue to load:")],
      components: [selectRow],
      withResponse: true,
      flags: "Ephemeral",
    })

    // Wait for the user to select a queue
    let selection: (typeof menuEntries)[number]
    try {
      const selectInteraction =
        await response.resource?.message?.awaitMessageComponent<ComponentType.StringSelect>(
          { time: 120_000 },
        )
      if (selectInteraction?.customId !== "loadqueue-select") return

      const idx = parseInt(selectInteraction.values[0]!)
      selection = menuEntries[idx]!

      const q = selection.queue
      const trackCount = q.tracks.length
      const totalDuration = duration(
        q.tracks.reduce((a, t) => a + (t.info?.length ?? 0), 0) / 1000,
      )
      const preview = q.tracks
        .slice(0, 5)
        .map((t, j) => `${j + 1}. **${cleanTrackTitle(t)}** - ${t.info.author}`)
        .join("\n")
      const more = trackCount > 5 ? `\n+${trackCount - 5} more` : ""

      const player = bot.getPlayer(i.guildId)
      const hasQueue = player && (player.current ?? player.queue.length > 0)

      // If the current queue is empty, skip the buttons and load directly
      if (!hasQueue) {
        const loadPlayer = player ?? (await bot.joinVC(i))
        await loadPlayer.addTracks(q.tracks)
        log(i, "loadqueue", `loaded ${trackCount} tracks`)

        await selectInteraction.update({
          embeds: [
            createMessageEmbed(
              `Loaded **${trackCount}** tracks`,
            ),
          ],
          components: [],
        })
        return
      }

      // Show the selected queue details with Replace / Append buttons
      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("loadqueue-replace")
          .setLabel("Replace Queue")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("loadqueue-append")
          .setLabel("Append to Queue")
          .setStyle(ButtonStyle.Primary),
      )

      await selectInteraction.update({
        embeds: [
          {
            title: `Queue from ${time(new Date(q.savedAt), TimestampStyles.RelativeTime)}`,
            description:
              `${trackCount} track${trackCount !== 1 ? "s" : ""}, ${totalDuration}\n\n` +
              preview +
              more,
            color: EmbedColor.Info,
          },
        ],
        components: [buttonRow],
      })
    } catch {
      await i.editReply({
        embeds: [createMessageEmbed("Selection timed out.")],
        components: [],
      })
      return
    }

    // Wait for the Replace/Append button click
    try {
      const buttonInteraction =
        await response.resource?.message?.awaitMessageComponent<ComponentType.Button>(
          { time: 120_000 },
        )

      if (!buttonInteraction) return

      const tracks = selection.queue.tracks
      const replace = buttonInteraction.customId === "loadqueue-replace"

      const player =
        bot.getPlayer(i.guildId) ?? (await bot.joinVC(i))

      if (replace) {
        player.q.clear()
      }

      await player.addTracks(tracks)
      log(i, "loadqueue", `${replace ? "replaced queue with" : "appended"} ${tracks.length} tracks`)

      await buttonInteraction.update({
        embeds: [
          createMessageEmbed(
            replace
              ? `Loaded **${tracks.length}** tracks (replaced queue)`
              : `Appended **${tracks.length}** tracks to the queue`,
          ),
        ],
        components: [],
      })
    } catch {
      await i.editReply({
        embeds: [createMessageEmbed("Selection timed out.")],
        components: [],
      })
    }
  },
})
