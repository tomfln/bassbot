import { createCommand, buildOptions } from "@bot/command"
import { cleanTrackTitle } from "@/util/helpers"
import { duration } from "@/util/time"
import { Queue } from "@/queue"
import isBoundChannel from "@/validators/isBoundChannel"
import isInGuild from "@/validators/isInGuild"
import { time, TimestampStyles } from "discord.js"
import { EmbedColor } from "@bot/message"

export default createCommand({
  description: "View recently played queues",

  options: buildOptions()
    .integer({
      name: "page",
      description: "Page number to display",
    })
    .build(),

  validators: [isBoundChannel(), isInGuild()],

  run: async ({ i, options, reply }) => {
    const entries = await Queue.getHistory(i.guildId)

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
