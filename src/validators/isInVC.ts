import { createValidator } from "@bot/validator"
import isInGuild from "./isInGuild"

/** Checks if the use is in a voice channel */
export default createValidator({
  deps: [isInGuild()],

  async validator(ctx) {
    if (!ctx.i.member.voice.channelId) {
      await ctx.reply.warn("You need to be in a voice channel to use this command.")
      return false
    }
    return true
  },
})
