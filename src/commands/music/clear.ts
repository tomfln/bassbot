import requireQueue from "@/middlewares/requireQueue"
import { createCommand } from "@bot/command"

export default createCommand({
  description: "Remove all songs from the queue",

  middleware: m => m.use(requireQueue),

  run: async ({ reply, data: { player } }) => {
    player.clear()
    return reply("Removed all songs from the queue")
  },
})
