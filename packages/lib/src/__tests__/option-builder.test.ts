import { describe, test, expect } from "bun:test"
import { buildOptions } from "../command"
import { ApplicationCommandOptionType } from "discord.js"

describe("buildOptions", () => {
  test("builds an empty options array", () => {
    const opts = buildOptions().build()
    expect(opts).toEqual([])
  })

  test("builds a single string option", () => {
    const opts = buildOptions()
      .string({ name: "query", description: "Search query", required: true as const })
      .build()

    expect(opts).toHaveLength(1)
    expect(opts[0]).toMatchObject({
      name: "query",
      description: "Search query",
      required: true,
      type: ApplicationCommandOptionType.String,
    })
  })

  test("builds multiple options of different types", () => {
    const opts = buildOptions()
      .string({ name: "song", description: "Song name", required: true as const })
      .integer({ name: "count", description: "Number of results" })
      .boolean({ name: "next", description: "Play next" })
      .build()

    expect(opts).toHaveLength(3)
    expect(opts[0]?.type).toBe(ApplicationCommandOptionType.String)
    expect(opts[1]?.type).toBe(ApplicationCommandOptionType.Integer)
    expect(opts[2]?.type).toBe(ApplicationCommandOptionType.Boolean)
  })

  test("preserves option metadata", () => {
    const opts = buildOptions()
      .string({
        name: "query",
        description: "Search term",
        required: true as const,
        min_length: 1,
        max_length: 100,
      })
      .build()

    expect(opts[0]).toMatchObject({
      name: "query",
      description: "Search term",
      required: true,
      min_length: 1,
      max_length: 100,
      type: ApplicationCommandOptionType.String,
    })
  })

  test("supports all option types", () => {
    const opts = buildOptions()
      .string({ name: "s", description: "str" })
      .integer({ name: "i", description: "int" })
      .number({ name: "n", description: "num" })
      .boolean({ name: "b", description: "bool" })
      .user({ name: "u", description: "user" })
      .channel({ name: "c", description: "chan" })
      .role({ name: "r", description: "role" })
      .mentionable({ name: "m", description: "ment" })
      .attachment({ name: "a", description: "attach" })
      .build()

    expect(opts).toHaveLength(9)
    const types = opts.map((o: any) => o.type)
    expect(types).toEqual([
      ApplicationCommandOptionType.String,
      ApplicationCommandOptionType.Integer,
      ApplicationCommandOptionType.Number,
      ApplicationCommandOptionType.Boolean,
      ApplicationCommandOptionType.User,
      ApplicationCommandOptionType.Channel,
      ApplicationCommandOptionType.Role,
      ApplicationCommandOptionType.Mentionable,
      ApplicationCommandOptionType.Attachment,
    ])
  })

  test("supports subcommands", () => {
    const opts = buildOptions()
      .subcommand({ name: "add", description: "Add something" })
      .subcommand({ name: "remove", description: "Remove something" })
      .build()

    expect(opts).toHaveLength(2)
    expect(opts[0]?.type).toBe(ApplicationCommandOptionType.Subcommand)
    expect(opts[1]?.type).toBe(ApplicationCommandOptionType.Subcommand)
  })
})
