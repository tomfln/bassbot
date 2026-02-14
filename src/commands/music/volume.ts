import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand, buildOptions } from "@bot/command"
import isInBoundVC from "@/validators/isInBoundVC"

export default createCommand({
  description: "Sets the volume of the music player.",
  options: buildOptions()
    .integer({
      name: "value",
      description: "The volume to set.",
      required: true,
      minValue: 0,
      maxValue: 100,
    })
    .build(),

  validators: [isInBoundVC()],
  middleware: m => m.use(requirePlayer),

  run: async ({ options, reply, data: { player } }) => {
    await player.setGlobalVolume(options.value / 2)
    return reply("Set the volume to **" + options.value + "%**.")
  },
})
