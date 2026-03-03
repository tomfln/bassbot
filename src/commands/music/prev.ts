import requireHistory from "@bot/middlewares/requireHistory"
import { createCommand } from "@lib/command"
import isInGuild from "@bot/validators/isInGuild"
import { log } from "@bot/util/activity-log"

export default createCommand({
  description: "Plays the previous song in the queue",
  detailDescription: "Goes back to the previously played song. Returns to the track that was playing before the current one.",
  sources: { command: true, button: true },
  
  validators: [isInGuild()],
  middleware: m => m.use(requireHistory),
  
  run: async ({ i, reply, data: { player } }) => {
    await player.prev()
    log(i, "prev", "went to previous song")
    return reply("Playing previous song.")
  },
})
