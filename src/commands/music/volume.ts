import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand, buildOptions } from "@lib/command"
import isInBoundVC from "@/validators/isInBoundVC"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Sets the volume of the music player.",
  detailDescription: "Adjusts the playback volume between 0 and 100. The default volume is 100. Changes take effect immediately on the current and future tracks.",
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

  run: async ({ i, options, reply, data: { player } }) => {
    await player.setGlobalVolume(options.value / 2)
    log(i, "volume", `set volume to ${options.value}%`)
    return reply("Set the volume to **" + options.value + "%**.")
  },
})
