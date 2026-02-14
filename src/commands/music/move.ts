import requireQueue from "@/middlewares/requireQueue"
import { createCommand, buildOptions } from "@bot/command"

export default createCommand({
  description: "Move a track in the queue to a different position",
  options: buildOptions()
    .integer({
      name: "from",
      description: "The position of the song to move in the queue",
      minValue: 1,
      required: true,
    })
    .integer({
      name: "to",
      description: "The position in the queue to move the song to",
      minValue: 1,
      required: true,
    })
    .build(),

  middleware: m => m.use(requireQueue),

  run: async ({ options, reply, data: { player } }) => {
    const moved = player.moveTrack(options.from - 1, options.to - 1)
    if (!moved) return reply.warn("Invalid queue position")
    return reply(`Moved track **${moved.info.title}** from position **${options.from}** to **${options.to}**`)
  },
})
