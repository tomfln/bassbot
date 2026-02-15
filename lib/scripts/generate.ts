import { mkdir, exists, readdir } from "node:fs/promises"
import path from "node:path"
import chalk from "chalk"
import { spawn } from "bun"
import { select, input } from "@inquirer/prompts"

const TEMPLATE_DIR = path.join(import.meta.dir, "templates")
const COMMANDS_DIR = "src/commands"

type TemplateType = "command" | "validator" | "middleware"

const templateAliases: Record<string, TemplateType> = {
  command: "command",
  cmd: "command",
  c: "command",
  validator: "validator",
  val: "validator",
  v: "validator",
  middleware: "middleware",
  m: "middleware",
}

/** Resolve a CLI arg to a template type, or null if invalid */
function resolveType(arg: string): TemplateType | null {
  return templateAliases[arg] ?? null
}

/** Get existing command categories from the filesystem */
async function getCategories(): Promise<string[]> {
  try {
    const entries = await readdir(COMMANDS_DIR, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

// ─── Parse CLI args ──────────────────────────────────────────────────────────

const [rawType, rawName] = process.argv.slice(2)
let type: TemplateType | null = rawType ? resolveType(rawType) : null
const name: string | undefined = rawName

// ─── Interactive prompts ─────────────────────────────────────────────────────

// Ask for template type if not provided or invalid
type ??= await select<TemplateType>({
  message: "What do you want to generate?",
  choices: [
    { name: "Command", value: "command" },
    { name: "Validator", value: "validator" },
    { name: "Middleware", value: "middleware" },
  ],
})

switch (type) {
  case "command": {
    let category: string
    let command: string

    if (name?.includes("/")) {
      const parts = name.split("/")
      category = parts[0]!
      command = parts[1]!
    } else {
      // Ask for category
      const categories = await getCategories()
      const NEW_CATEGORY = "__new__"

      const categoryChoice = await select({
        message: "Category:",
        choices: [
          ...categories.map((c) => ({ name: c, value: c })),
          { name: chalk.dim("+ New category"), value: NEW_CATEGORY },
        ],
      })

      category =
        categoryChoice === NEW_CATEGORY
          ? await input({ message: "New category name:" })
          : categoryChoice

      // Ask for command name
      command = name ?? (await input({ message: "Command name:" }))
    }

    console.log(
      `\nCreating command ${chalk.green(command)} in category ${chalk.green(category)}`,
    )
    await generateCommand(category, command)
    break
  }

  case "validator": {
    const validatorName = name ?? (await input({ message: "Validator name:" }))
    console.log(`\nCreating validator ${chalk.green(validatorName)}`)
    await generateValidator(validatorName)
    break
  }

  case "middleware": {
    const middlewareName = name ?? (await input({ message: "Middleware name:" }))
    console.log(`\nCreating middleware ${chalk.green(middlewareName)}`)
    await generateMiddleware(middlewareName)
    break
  }
}

// ─── Generators ──────────────────────────────────────────────────────────────

async function generateCommand(category: string, command: string) {
  const commandDir = `${COMMANDS_DIR}/${category}`
  await mkdir(commandDir, { recursive: true })
  await writeTemplate("command", `${commandDir}/${command}.ts`)
}

async function generateValidator(name: string) {
  const validatorDir = "src/validators"
  await mkdir(validatorDir, { recursive: true })
  await writeTemplate("validator", `${validatorDir}/${name}.ts`)
}

async function generateMiddleware(name: string) {
  const middlewareDir = "src/middlewares"
  await mkdir(middlewareDir, { recursive: true })
  await writeTemplate("middleware", `${middlewareDir}/${name}.ts`)
}

async function writeTemplate(template: string, dest: string) {
  const src = path.join(TEMPLATE_DIR, `${template}.template.ts`)
  if (await exists(dest)) {
    console.error(`\nFile '${dest}' already exists.`)
    process.exit(1)
  }
  await Bun.write(dest, Bun.file(src))
  console.log(" -> " + chalk.blue(chalk.underline(dest)))

  // Open generated file in current vscode instance
  if (isVsCodeTerminal()) spawn({ cmd: [getVsCodeBinary(), "-r", dest] })
}

function isVsCodeTerminal() {
  return process.env.TERM_PROGRAM == "vscode"
}

function getVsCodeBinary() {
  return (
    process.env.VSCODE_GIT_ASKPASS_NODE ??
    (process.env.TERM_PROGRAM_VERSION?.includes("insider") ? "code-insiders" : "code")
  )
}
