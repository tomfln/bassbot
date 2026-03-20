import requirePlayer from "@bot/middlewares/requirePlayer"
import { createCommand } from "@lib/command"
import isBoundChannel from "@bot/validators/isBoundChannel"
import isInBoundVC from "@bot/validators/isInBoundVC"
import { log } from "@bot/util/activity-log"

export default createCommand({
  description: "Stops the player and quits the voice channel",
  detailDescription: "Stops playback, clears the queue, and disconnects the bot from the voice channel. This completely ends the listening session.",

  validators: [isBoundChannel(), isInBoundVC()],
  middleware: m => m.use(requirePlayer),

  run: async ({ i, reply, data: { player } }) => {
    await player.disconnect()
    log(i, "stop", "stopped the player")
    return reply("Stopped the music")
  },
})
