import requireQueue from "@/middlewares/requireQueue"
import { createCommand, buildOptions } from "@bot/command"

export default createCommand({
  description: "Remove one or many songs from the queue",
  options: buildOptions()
    .integer({
      name: "position",
      description: "The queue position of the song to remove",
      required: true,
    })
    .integer({
      name: "end",
      description: "The queue position of the last song to remove",
    })
    .build(),

  middleware: m => m.use(requireQueue),

  run: async ({ options, reply, data: { player } }) => {
    const deleteCount = player.remove(options.position - 1, (options.end ?? options.position) - 1)
    if (!deleteCount) return reply("Invalid queue position")
    return reply(`Removed ${deleteCount} song${deleteCount > 1 ? "s" : ""} from the queue`)
  },
})
