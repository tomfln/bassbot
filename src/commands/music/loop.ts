import requirePlayer from "@/middlewares/requirePlayer"
import { LoopMode } from "@/player"
import { createCommand, buildOptions } from "@bot/command"
import { z } from "zod"

const isValidLoopMode = (mode: string): mode is LoopMode => {
  return mode in LoopMode
}

const loopModeSchema = z.string().refine(isValidLoopMode)

export default createCommand({
  description: "Change the Loop Mode",
  options: buildOptions()
    .string({
      name: "mode",
      description: "The loop mode",
      required: true,
      choices: [
        { name: "None", value: "None" },
        { name: "Song", value: "Song" },
        { name: "Queue", value: "Queue" },
        { name: "Autoplay", value: "Autoplay" },
      ],
    })
    .build(),

  middleware: (m) => m.use(requirePlayer),

  run: async ({ options, reply, data: { player } }) => {
    const res = loopModeSchema.safeParse(options.mode)
    if (!res.success) return reply.warn("Invalid Loop Mode")

    player.setLoopMode(res.data)
    return reply(`Set Loop Mode to '${res.data}'`)
  },
})
