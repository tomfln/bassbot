import requirePlayer from "@bot/middlewares/requirePlayer"
import { createCommand, buildOptions } from "@lib/command"
import { log } from "@bot/util/activity-log"

export default createCommand({
  description: "Plays the next song in the queue",
  detailDescription: "Skips to the next song in the queue. You can optionally specify a position to skip directly to a specific song in the queue.",
  sources: { command: true, button: true },

  options: buildOptions()
    .integer({
      name: "position",
      description: "The position in the queue to skip to",
      minValue: 1,
    })
    .build(),

  middleware: m => m.use(requirePlayer),

  run: async ({ i, options, reply, data: { player } }) => {
    await player.next(options?.position)
    log(i, "skip", options?.position ? `skipped to position ${options.position}` : "skipped to next song")
    return reply("Playing next song.")
  },
})
