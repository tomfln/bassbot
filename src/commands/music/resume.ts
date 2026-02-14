import requirePlayer from "@/middlewares/requirePlayer";
import { createCommand } from "@bot/command";

export default createCommand({
  description: "Resume the current song",
  sources: { command: true, button: true },

  middleware: m => m.use(requirePlayer),

  run: async ({ reply, data: { player } }) => {
    if (player.paused) {
      await player.setPaused(false)
      return reply("Resumed.")
    } else {
      return reply("Already playing.")
    }
  }
})