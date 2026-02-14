import { createCommand, buildOptions } from "@/util/command"
import { ApplicationCommandOptionType } from "discord.js"
import pixelWidth from "string-pixel-width"

const typeMap = {
  [ApplicationCommandOptionType.String]: "string",
  [ApplicationCommandOptionType.Integer]: "integer",
  [ApplicationCommandOptionType.Number]: "number",
  [ApplicationCommandOptionType.Boolean]: "boolean",
  [ApplicationCommandOptionType.User]: "user",
  [ApplicationCommandOptionType.Channel]: "channel",
  [ApplicationCommandOptionType.Role]: "role",
  [ApplicationCommandOptionType.Mentionable]: "mentionable",
  [ApplicationCommandOptionType.Attachment]: "attachment",
  [ApplicationCommandOptionType.Subcommand]: "subcommand",
  [ApplicationCommandOptionType.SubcommandGroup]: "group",
} as const

export default createCommand({
  description: "Show help for a command.",
  options: buildOptions()
    .string({
      name: "command",
      description: "The command to get help for.",
    })
    .build(),

  run: async ({ options: { command }, reply, bot }) => {
    const commands = [...bot.commands.values()]

    let title = ""
    let description = ""
    let footer = ""

    if (command) {
      const cmd = commands.find((c) => c.name === command)
      if (!cmd) return reply.error(`Command '${command}' not found.`)
      footer = "Options marked with * are required."
      title = `Command: ${cmd.name}`
      const desc = typeof cmd.description === "string" ? cmd.description : cmd.description["en-US"] ?? Object.values(cmd.description)[0] ?? ""
      description = desc + "\n\n"
      cmd.options?.forEach((o) => {
        description += `${typeMap[o.type]} **${o.name}**${"required" in o ? "*" : ""}: ${o.description}\n`
        if (o.type == ApplicationCommandOptionType.Subcommand) {
          o.options?.forEach((so) => {
            description += ` - ${typeMap[so.type]} **${so.name}**: ${so.description}\n`
          })
        }
      })
    } else {
      let maxlen = commands.reduce((acc, c) => {
        const len = pixelWidth(c.name, { bold: true, font: "arial" })
        if (len > acc) acc = len
        return acc
      }, 0)

      maxlen = Math.round(maxlen * 1.5)
      title = "Available commands"
      description = commands
        .map(
          (cmd) => {
            const desc = typeof cmd.description === "string" ? cmd.description : cmd.description["en-US"] ?? Object.values(cmd.description)[0] ?? ""
            return `** ${cmd.name}**  ${"\u00A0".repeat(
              Math.round((maxlen - 1.4 * pixelWidth(cmd.name, { bold: true, font: "arial" })) / pixelWidth("-")) + 3,
            )}  ${desc}`
          },
        )
        .join("\n")
      footer = "Type /help <command> to get more information about a specific command."
    }

    await reply(description, { flags: "Ephemeral", title, footer: { text: footer } })
  },
})
