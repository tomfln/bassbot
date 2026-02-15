import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand, buildOptions } from "@bot/command"
import { Timestamp } from "@/util/time"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Seek to the specified time in the current song",
  options: buildOptions()
    .string({
      name: "time",
      description: "The time to seek to in format X:XX",
      required: true,
    })
    .build(),

  middleware: m => m.use(requirePlayer),

  run: async ({ i, options, reply, data: { player } }) => {
    const info = player.current?.info
    if (!info?.isSeekable) return reply.warn("This track is not seekable")

    const { success, value: duration, error } = Timestamp.from(options.time)
    if (!success) return reply.warn(error)

    if (duration.asMillis() > info.length) {
      return reply.warn(`Track is only ${Timestamp.fromMillis(info.length)} long`)
    }

    await player.seekTo(duration.asMillis())
    log(i, "seek", `seeked to ${duration}`)

    return reply(`Seeked to ${duration}`)
  },
})
