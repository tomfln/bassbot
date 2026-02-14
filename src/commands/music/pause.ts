import requirePlayer from "@/middlewares/requirePlayer"
import { createCommand } from "@bot/command"

export default createCommand({
  description: "Pauses the player",
  sources: { command: true, button: true },

  middleware: m => m.use(requirePlayer),

  run: async ({ reply, data: { player } }) => {
    const newState = !player.paused
    await player.setPaused(newState)
    await reply(newState ? "Paused." : "Resumed.")
  },
})
