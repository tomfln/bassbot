import requireQueue from "@/middlewares/requireQueue"
import { createCommand } from "@lib/command"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Shuffles the queue",
  detailDescription: "Randomly reorders all songs in the queue. The currently playing song stays in place. Shuffling is immediate and cannot be undone.",

  middleware: m => m.use(requireQueue),

  run: async ({ i, reply, data: { player } }) => {
    player.shuffle()
    log(i, "shuffle", "shuffled the queue")
    return reply("Shuffled the queue.")
  },
})
