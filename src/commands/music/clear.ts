import requireQueue from "@bot/middlewares/requireQueue"
import { createCommand } from "@lib/command"
import { log } from "@bot/util/activity-log"

export default createCommand({
  description: "Remove all songs from the queue",
  detailDescription: "Removes all songs from the queue at once. The currently playing song will continue until it ends or is skipped.",

  middleware: m => m.use(requireQueue),

  run: async ({ i, reply, data: { player } }) => {
    const count = player.queue.length
    player.clear()
    log(i, "clear", `cleared ${count} songs from the queue`)
    return reply("Removed all songs from the queue")
  },
})
