import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand } from "@bot/command"
import isBoundChannel from "@/validators/isBoundChannel"
import isInBoundVC from "@/validators/isInBoundVC"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Stops the player and quits the voice channel",

  validators: [isBoundChannel(), isInBoundVC()],
  middleware: m => m.use(requirePlayer),

  run: async ({ i, reply, data: { player } }) => {
    await player.disconnect()
    log(i, "stop", "stopped the player")
    return reply("Stopped the music")
  },
})
