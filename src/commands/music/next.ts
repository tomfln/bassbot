import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand, buildOptions } from "@bot/command"

export default createCommand({
  description: "Plays the next song in the queue",
  sources: { command: true, button: true },

  options: buildOptions()
    .integer({
      name: "position",
      description: "The position in the queue to skip to",
      minValue: 1,
    })
    .build(),

  middleware: m => m.use(requirePlayer),

  run: async ({ options, reply, data: { player } }) => {
    await player.next(options?.position)
    return reply("Playing next song.")
  },
})
