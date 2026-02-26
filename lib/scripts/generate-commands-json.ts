/**
 * Generates web/data/commands.json from the bot command source files.
 * Run: bun lib/scripts/generate-commands-json.ts
 */
import fs from "node:fs"
import path from "node:path"
import { ApplicationCommandOptionType } from "discord.js"

const COMMANDS_DIR = path.resolve(import.meta.dir, "../../src/commands")
const OUTPUT_FILE = path.resolve(import.meta.dir, "../../web/data/commands.json")

const typeNames: Record<number, string> = {
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
}

interface CommandOption {
  name: string
  description: string
  type: string
  required?: boolean
  choices?: { name: string; value: string | number }[]
  minValue?: number
  maxValue?: number
}

interface CommandInfo {
  name: string
  category: string
  description: string
  options: CommandOption[]
}

async function main() {
  const commands: CommandInfo[] = []

  for (const category of fs.readdirSync(COMMANDS_DIR)) {
    const categoryPath = path.join(COMMANDS_DIR, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    for (const file of fs.readdirSync(categoryPath)) {
      if (!file.endsWith(".ts")) continue
      const name = file.replace(/\.ts$/, "")

      try {
        const mod = await import(path.join(categoryPath, file))
        const cmd = mod.default

        if (!cmd?.description) {
          console.warn(`  ⚠ Skipping ${category}/${name}: no description`)
          continue
        }

        const description =
          typeof cmd.description === "string"
            ? cmd.description
            : cmd.description["en-US"] ?? Object.values(cmd.description)[0] ?? ""

        const options: CommandOption[] = (cmd.options ?? []).map((opt: any) => {
          const o: CommandOption = {
            name: opt.name,
            description: opt.description ?? "",
            type: typeNames[opt.type] ?? "unknown",
          }
          if (opt.required) o.required = true
          if (opt.choices?.length) o.choices = opt.choices
          if (opt.minValue != null) o.minValue = opt.minValue
          if (opt.maxValue != null) o.maxValue = opt.maxValue
          return o
        })

        commands.push({ name, category, description, options })
        console.log(`  ✓ ${category}/${name}`)
      } catch (err) {
        console.warn(`  ⚠ Failed: ${category}/${name}: ${(err as Error).message}`)
      }
    }
  }

  commands.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(commands, null, 2) + "\n")
  console.log(`\n✅ Generated ${commands.length} commands → ${OUTPUT_FILE}`)
}

main().catch(console.error)
