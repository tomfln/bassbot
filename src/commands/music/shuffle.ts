import requireQueue from "@/middlewares/requireQueue"
import { createCommand } from "@bot/command"

export default createCommand({
  description: "Shuffles the queue",

  middleware: m => m.use(requireQueue),

  run: async ({ reply, data: { player } }) => {
    player.shuffle()
    return reply("Shuffled the queue.")
  },
})
