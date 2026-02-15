import requireQueue from "@/middlewares/requireQueue"
import { createCommand } from "@bot/command"
import { log } from "@/util/activity-log"

export default createCommand({
  description: "Remove all songs from the queue",

  middleware: m => m.use(requireQueue),

  run: async ({ i, reply, data: { player } }) => {
    const count = player.queue.length
    player.clear()
    log(i, "clear", `cleared ${count} songs from the queue`)
    return reply("Removed all songs from the queue")
  },
})
