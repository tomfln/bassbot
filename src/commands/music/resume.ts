import requirePlayer from "@/middlewares/requirePlayer";
import { createCommand } from "@lib/command";
import { log } from "@/util/activity-log";

export default createCommand({
  description: "Resume the current song",
  detailDescription: "Resumes playback of the currently paused song from where it was paused. Has no effect if the player is already playing.",
  sources: { command: true, button: true },

  middleware: m => m.use(requirePlayer),

  run: async ({ i, reply, data: { player } }) => {
    if (player.paused) {
      await player.setPaused(false)
      log(i, "resume", "resumed playback")
      return reply("Resumed.")
    } else {
      return reply("Already playing.")
    }
  }
})