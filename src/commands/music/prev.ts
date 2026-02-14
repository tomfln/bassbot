import requireHistory from "@/middlewares/requireHistory"
import { createCommand } from "@bot/command"
import isInGuild from "@/validators/isInGuild"

export default createCommand({
  description: "Plays the previous song in the queue",
  sources: { command: true, button: true },
  
  validators: [isInGuild()],
  middleware: m => m.use(requireHistory),
  
  run: async ({ reply, data: { player } }) => {
    await player.prev()
    return reply("Playing previous song.")
  },
})
