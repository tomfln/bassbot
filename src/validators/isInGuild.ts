import { createValidator } from "@bot/validator"

/** Checks if the command was run in a guild */
export default createValidator(async ctx => {
  if (!ctx.i.guildId) {
    await ctx.reply.error("Please use this command in a server.")
    return false
  }
  return true
})