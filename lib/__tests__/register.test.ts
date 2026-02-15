import { describe, test, expect } from "bun:test"
import { serializeCommand, commandsMatch } from "../register"
import type { LoadedCommand } from "../command"
import { ApplicationCommandOptionType } from "discord.js"

function makeCommand(overrides: Partial<LoadedCommand> = {}): LoadedCommand {
  return {
    name: "test",
    description: "A test command",
    category: "general",
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    run: async () => {},
    ...overrides,
  }
}

describe("serializeCommand", () => {
  test("serializes a basic command", () => {
    const cmd = makeCommand({ name: "play", description: "Play music" })
    const serialized = serializeCommand(cmd)

    expect(serialized.name).toBe("play")
    expect(serialized.description).toBe("Play music")
    expect(serialized.options).toBeUndefined()
    expect(serialized.nsfw).toBeUndefined()
  })

  test("serializes command with options", () => {
    const cmd = makeCommand({
      name: "play",
      description: "Play music",
      options: [
        { name: "query", description: "Search", type: ApplicationCommandOptionType.String, required: true },
      ] as any,
    })
    const serialized = serializeCommand(cmd)

    expect(serialized.options).toHaveLength(1)
    expect(serialized.options![0].name).toBe("query")
  })

  test("serializes localized description", () => {
    const cmd = makeCommand({
      description: {
        "en-US": "Play music",
        "de": "Musik abspielen",
      } as any,
    })
    const serialized = serializeCommand(cmd)

    expect(serialized.description).toBe("Play music")
    expect(serialized.description_localizations).toBeDefined()
    expect(serialized.description_localizations!.de).toBe("Musik abspielen")
  })

  test("serializes nsfw flag", () => {
    const cmd = makeCommand({ nsfw: true })
    const serialized = serializeCommand(cmd)
    expect(serialized.nsfw).toBe(true)
  })

  test("serializes defaultMemberPermissions", () => {
    const cmd = makeCommand({ defaultMemberPermissions: 8 as any }) // ADMINISTRATOR
    const serialized = serializeCommand(cmd)
    expect(serialized.default_member_permissions).toBe("8")
  })

  test("omits empty options", () => {
    const cmd = makeCommand({ options: [] })
    const serialized = serializeCommand(cmd)
    expect(serialized.options).toBeUndefined()
  })
})

describe("commandsMatch", () => {
  test("returns true for identical commands", () => {
    const local = [{ name: "play", description: "Play music" }]
    const remote = [{ name: "play", description: "Play music" }]
    expect(commandsMatch(local, remote)).toBe(true)
  })

  test("returns false for different command count", () => {
    const local = [
      { name: "play", description: "Play music" },
      { name: "stop", description: "Stop music" },
    ]
    const remote = [{ name: "play", description: "Play music" }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("returns false for different descriptions", () => {
    const local = [{ name: "play", description: "Play music" }]
    const remote = [{ name: "play", description: "Play a song" }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("returns false for missing command name", () => {
    const local = [{ name: "play", description: "Play" }]
    const remote = [{ name: "stop", description: "Stop" }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("matches commands with identical options", () => {
    const opts = [
      { name: "query", type: 3, required: true, description: "Search query" },
    ]
    const local = [{ name: "play", description: "Play", options: opts }]
    const remote = [{ name: "play", description: "Play", options: opts }]
    expect(commandsMatch(local, remote)).toBe(true)
  })

  test("detects option name changes", () => {
    const localOpts = [{ name: "query", type: 3, required: true, description: "Search" }]
    const remoteOpts = [{ name: "song", type: 3, required: true, description: "Search" }]
    const local = [{ name: "play", description: "Play", options: localOpts }]
    const remote = [{ name: "play", description: "Play", options: remoteOpts }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("detects option type changes", () => {
    const localOpts = [{ name: "count", type: 4, description: "Number" }]  // INTEGER
    const remoteOpts = [{ name: "count", type: 3, description: "Number" }] // STRING
    const local = [{ name: "test", description: "Test", options: localOpts }]
    const remote = [{ name: "test", description: "Test", options: remoteOpts }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("detects required flag changes", () => {
    const localOpts = [{ name: "q", type: 3, required: true, description: "Q" }]
    const remoteOpts = [{ name: "q", type: 3, required: false, description: "Q" }]
    const local = [{ name: "test", description: "Test", options: localOpts }]
    const remote = [{ name: "test", description: "Test", options: remoteOpts }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("handles commands with no options", () => {
    const local = [{ name: "ping", description: "Pong" }]
    const remote = [{ name: "ping", description: "Pong" }]
    expect(commandsMatch(local, remote)).toBe(true)
  })

  test("matches regardless of command order", () => {
    const local = [
      { name: "play", description: "Play" },
      { name: "stop", description: "Stop" },
    ]
    const remote = [
      { name: "stop", description: "Stop" },
      { name: "play", description: "Play" },
    ]
    expect(commandsMatch(local, remote)).toBe(true)
  })

  test("matches empty command sets", () => {
    expect(commandsMatch([], [])).toBe(true)
  })

  test("detects nested subcommand option changes", () => {
    const localOpts = [
      {
        name: "add", type: 1, description: "Add",
        options: [{ name: "song", type: 3, description: "Song name" }],
      },
    ]
    const remoteOpts = [
      {
        name: "add", type: 1, description: "Add",
        options: [{ name: "track", type: 3, description: "Song name" }],
      },
    ]
    const local = [{ name: "queue", description: "Queue", options: localOpts }]
    const remote = [{ name: "queue", description: "Queue", options: remoteOpts }]
    expect(commandsMatch(local, remote)).toBe(false)
  })

  test("detects choice changes", () => {
    const localOpts = [
      {
        name: "mode", type: 3, description: "Loop mode",
        choices: [
          { name: "None", value: "none" },
          { name: "Song", value: "song" },
        ],
      },
    ]
    const remoteOpts = [
      {
        name: "mode", type: 3, description: "Loop mode",
        choices: [
          { name: "None", value: "none" },
          { name: "Queue", value: "queue" },
        ],
      },
    ]
    const local = [{ name: "loop", description: "Loop", options: localOpts }]
    const remote = [{ name: "loop", description: "Loop", options: remoteOpts }]
    expect(commandsMatch(local, remote)).toBe(false)
  })
})
