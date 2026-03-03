import { createCommand, buildOptions } from "@lib/command"
import { cleanTrackTitle } from "@bot/util/helpers"
import { duration } from "@bot/util/time"
import { Queue } from "@bot/queue"
import isBoundChannel from "@bot/validators/isBoundChannel"
import isInGuild from "@bot/validators/isInGuild"
import { time, TimestampStyles } from "discord.js"
import { EmbedColor } from "@lib/message"

export default createCommand({
  description: "View recently played queues",
  detailDescription: "Shows a list of recently played queues for this server. Each entry shows when it was played and how many songs it contained. Use /loadqueue to restore a previous queue.",

  options: buildOptions()
    .integer({
      name: "page",
      description: "Page number to display",
    })
    .build(),

  validators: [isBoundChannel(), isInGuild()],

  run: async ({ i, options, reply }) => {
    const entries = Queue.getHistory(i.guildId)

    if (entries.length === 0) {
      return reply("No recent queues found.")
    }

    const pageSize = 5
    const maxPage = Math.ceil(entries.length / pageSize)
    const page = Math.min(Math.max(options.page ?? 1, 1), maxPage)

    const pageEntries = entries.slice(pageSize * (page - 1), pageSize * page)

    const description = pageEntries
      .map((entry, idx) => {
        const q = entry.queue
        const date = new Date(q.savedAt)
        const trackCount = q.tracks.length
        const totalDuration = q.tracks.reduce(
          (acc, t) => acc + (t.info?.length ?? 0),
          0,
        )

        // Show first 3 tracks as a preview
        const preview = q.tracks
          .slice(0, 3)
          .map((t) => `\`${cleanTrackTitle(t)}\``)
          .join(", ")
        const more =
          trackCount > 3 ? ` +${trackCount - 3} more` : ""

        const globalIdx = pageSize * (page - 1) + idx + 1
        return (
          `**${globalIdx}.** ${trackCount} track${trackCount !== 1 ? "s" : ""}, ` +
          `${duration(totalDuration / 1000)} (${time(date, TimestampStyles.RelativeTime)})\n` +
          `${preview}${more}`
        )
      })
      .join("\n\n")

    await i.reply({
      embeds: [
        {
          title: "Recent Queues",
          description,
          color: EmbedColor.Info,
          footer: {
            text: `Page ${page} of ${maxPage}`,
          },
        },
      ],
    })
  },
})
