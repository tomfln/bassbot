import { createCommand } from "@bot/command"
import { duration } from "@/util/time"
import { EmbedBuilder } from "discord.js"

export default createCommand({
  description: "Shows basic information about the bot.",

  run: async ({ i, bot }) => {
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

    const embed = new EmbedBuilder()
      .setTitle(`${bot.user.username}#${bot.user.discriminator}`)
      .setDescription("A Bot that can play music and moderates the server.")
      .setTimestamp()
      .addFields(
        { name: "Uptime", value: duration(process.uptime()) },
        { name: "Memory Usage", value: `${memUsage} MB` },
        { name: "Server Count", value: String(bot.guilds.cache.size) },
        { name: "Made by", value: "<@339719840363184138>" }
      )

    await i.reply({
      embeds: [embed],
    })
  },
})
