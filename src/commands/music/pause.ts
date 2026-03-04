import requirePlayer from "@bot/middlewares/requirePlayer"
import { createCommand } from "@lib/command"
import { log } from "@bot/util/activity-log"

export default createCommand({
  description: "Pauses the player",
  detailDescription: "Pauses the currently playing song. The playback position is saved so you can resume from where you left off with /resume.",
  sources: { command: true, button: true },

  middleware: m => m.use(requirePlayer),

  run: async ({ i, reply, data: { player } }) => {
    const newState = !player.paused
    await player.setPaused(newState)
    log(i, newState ? "pause" : "resume", newState ? "paused playback" : "resumed playback")
    await reply(newState ? "Paused." : "Resumed.")
  },
})
