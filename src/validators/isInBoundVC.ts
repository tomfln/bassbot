import db from "@/util/db"
import { isAllowedChannel } from "@/util/helpers"
import { createValidator } from "@bot/validator"
import isInGuild from "./isInGuild"
import isInVC from "./isInVC"

/** Checks if the user's voice channel is bound */
export default createValidator({
  deps: [isInGuild(), isInVC()],

  async validator(ctx) {
    const guildOpts = await db.guildOptions.find({ guildId: ctx.i.guildId })
    if (isAllowedChannel(guildOpts, ctx.i.member.voice.channelId!)) return true
    
    await ctx.reply.error(
      "Please use one of these channels for music commands:\n\n" +
        guildOpts.channels.map((id) => `<#${id}>`).join(", "),
      { flags: "Ephemeral" }
    )
    return false
  },
})
