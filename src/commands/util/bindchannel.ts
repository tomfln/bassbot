import { buildOptions, createCommand } from "@bot/command"
import { PermissionFlagsBits } from "discord.js"
import db from "@/util/db"
import { schema } from "@/util/db"
import { eq } from "drizzle-orm"
import logger from "@bot/logger"
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
    const { id, channels } = guildOpts

    switch (options.__cmd) {
      case "add":
        if (channels.includes(options.channel.id)) return reply.warn("This channel is already bound.")
        db.update(schema.guildOptions)
          .set({ channels: [...channels, options.channel.id] })
          .where(eq(schema.guildOptions.id, id))
          .run()
        logger.info(`Binding channel ${options.channel.id} in guild '${i.guild.name}'`)
        return reply(`Successfully bound to channel <#${options.channel.id}>.`, {
          flags: "Ephemeral",
          color: 0x22ff22,
        })

      case "remove":
        db.update(schema.guildOptions)
          .set({ channels: channels.filter((c) => c !== options.channel.id) })
          .where(eq(schema.guildOptions.id, id))
          .run()
        logger.info(`Unbinding channel ${options.channel.id} in guild '${i.member.guild.name}'`)
        return reply(`Successfully unbound channel <#${options.channel.id}>.`, {
          flags: "Ephemeral",
          color: 0x22ff22,
        })

      case "clear":
        logger.info(`Clearing bound channels in guild '${i.member.guild.name}'`)
        db.update(schema.guildOptions)
          .set({ channels: [] })
          .where(eq(schema.guildOptions.id, id))
          .run()
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
