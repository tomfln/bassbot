import requireQueue from "@/middlewares/requireQueue"
import { createCommand } from "@bot/command"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Shuffles the queue",

  middleware: m => m.use(requireQueue),

  run: async ({ i, reply, data: { player } }) => {
    player.shuffle()
    log(i, "shuffle", "shuffled the queue")
    return reply("Shuffled the queue.")
  },
})
