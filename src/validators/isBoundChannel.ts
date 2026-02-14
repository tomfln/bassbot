import db from "@/util/db"
import { isAllowedChannel } from "@/util/helpers"
import { createValidator } from "@bot/validator"
import isInGuild from "./isInGuild"

/** Checks if the text channel is bound */
export default createValidator({
  deps: [isInGuild()],

  async validator(ctx) {
    const guildOpts = await db.guildOptions.find({ guildId: ctx.i.guildId })
    if (isAllowedChannel(guildOpts, ctx.i.channelId)) return true

    await ctx.reply.error(
      "Please use one of these channels for music commands:\n\n" +
        guildOpts.channels.map((id) => `<#${id}>`).join(", "),
      { flags: "Ephemeral" }
    )
    return false
  },
})
