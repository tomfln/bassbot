import { createValidator } from "@bot/validator"
import isInGuild from "./isInGuild"

export default createValidator({
  deps: [isInGuild()],

  async validator({ bot, i, reply }) {
    const connection = bot.lava.connections.get(i.guildId)

    if (connection?.channelId && connection.channelId !== i.member.voice.channelId!) {
      await reply.error(`Already playing music in <#${connection.channelId}>`)
      return false
    }
    return true
  },
})
