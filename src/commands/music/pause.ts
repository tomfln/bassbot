import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand } from "@bot/command"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Pauses the player",
  sources: { command: true, button: true },

  middleware: m => m.use(requirePlayer),

  run: async ({ i, reply, data: { player } }) => {
    const newState = !player.paused
    await player.setPaused(newState)
    log(i, newState ? "pause" : "resume", newState ? "paused playback" : "resumed playback")
    await reply(newState ? "Paused." : "Resumed.")
  },
})
