import { createValidator } from "@bot/validator"
import type { PermissionResolvable } from "discord.js"

export default createValidator<[permissions: PermissionResolvable, checkAdmin?: boolean]>(
  async (ctx, permissions, checkAdmin) => {
    if (ctx.i.member.permissions.has(permissions, checkAdmin)) return true
    await ctx.reply.warn("You are not authorized to use this command.")
    return false
  }
)
