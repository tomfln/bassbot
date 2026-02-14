import { buildOptions, createCommand } from "@bot/command"
import { PermissionFlagsBits } from "discord.js"
import db from "@/util/db"
import logger from "@bot/logger"
import { $push } from "@nlfmt/stormdb"
import hasPermissions from "@/validators/hasPermissions"
import getOrCreateGuildOpts from "@/middlewares/getOrCreateGuildOpts"

export default createCommand({
  description: "Bind the bot to a voice or text channel.",
  options: buildOptions()
    .subcommand({
      name: "add",
      description: "Bind a channel.",
      options: buildOptions()
        .channel({
          name: "channel",
          description: "The target channel.",
          required: true,
        })
        .build(),
    })
    .subcommand({
      name: "remove",
      description: "Unbind a channel.",
      options: buildOptions()
        .channel({
          name: "channel",
          description: "The target channel.",
          required: true,
        })
        .build(),
    })
    .subcommand({
      name: "clear",
      description: "Clear all bound channels.",
    })
    .subcommand({
      name: "list",
      description: "List all bound channels.",
    })
    .build(),

  validators: [hasPermissions(PermissionFlagsBits.ManageGuild)],
  middleware: m => m.use(getOrCreateGuildOpts),

  run: async ({ i, options, reply, data: { guildOpts } }) => {
    const { _id: id, channels } = guildOpts

    switch (options.__cmd) {
      case "add":
        if (channels.includes(options.channel.id)) return reply.warn("This channel is already bound.")
        await db.guildOptions.updateById(id, {
          channels: $push(options.channel.id),
        })
        logger.info(`Binding channel ${options.channel.id} in guild '${i.guild.name}'`)
        return reply(`Successfully bound to channel <#${options.channel.id}>.`, {
          flags: "Ephemeral",
          color: 0x22ff22,
        })

      case "remove":
        await db.guildOptions.updateById(id, {
          channels: (channels) => channels.filter((c) => c !== options.channel.id),
        })
        logger.info(`Unbinding channel ${options.channel.id} in guild '${i.member.guild.name}'`)
        return reply(`Successfully unbound channel <#${options.channel.id}>.`, {
          flags: "Ephemeral",
          color: 0x22ff22,
        })

      case "clear":
        logger.info(`Clearing bound channels in guild '${i.member.guild.name}'`)
        await db.guildOptions.updateById(id, {
          channels: [],
        })
        return reply("Successfully cleared channels.", {
          flags: "Ephemeral",
          color: 0x22ff22,
        })

      case "list":
        if (channels.length == 0) return reply("No channels are bound.")
        return reply(`Bound channels: ${channels.map((c) => `<#${c}>`).join(", ")}`, { flags: "Ephemeral" })
    }
  },
})
