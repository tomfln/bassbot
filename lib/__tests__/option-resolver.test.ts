import { describe, test, expect } from "bun:test"
import { parseOptions } from "../command"
import { ApplicationCommandOptionType as OptionType } from "discord.js"

// Minimal mock of ChatInputCommandInteraction for option parsing
function mockInteraction(options: any[]) {
  return { options: { data: options } } as any
}

describe("parseOptions", () => {
  test("parses string options", () => {
    const i = mockInteraction([
      { name: "query", type: OptionType.String, value: "hello world" },
    ])
    const parsed = parseOptions(i)
    expect(parsed.query).toBe("hello world")
  })

  test("parses integer options", () => {
    const i = mockInteraction([
      { name: "count", type: OptionType.Integer, value: 5 },
    ])
    const parsed = parseOptions(i)
    expect(parsed.count).toBe(5)
  })

  test("parses boolean options", () => {
    const i = mockInteraction([
      { name: "next", type: OptionType.Boolean, value: true },
    ])
    const parsed = parseOptions(i)
    expect(parsed.next).toBe(true)
  })

  test("parses number (float) options", () => {
    const i = mockInteraction([
      { name: "volume", type: OptionType.Number, value: 0.75 },
    ])
    const parsed = parseOptions(i)
    expect(parsed.volume).toBe(0.75)
  })

  test("parses user options", () => {
    const mockUser = { id: "123", username: "test" }
    const i = mockInteraction([
      { name: "target", type: OptionType.User, user: mockUser },
    ])
    const parsed = parseOptions(i)
    expect(parsed.target).toEqual(mockUser)
  })

  test("parses channel options", () => {
    const mockChannel = { id: "456", name: "general" }
    const i = mockInteraction([
      { name: "channel", type: OptionType.Channel, channel: mockChannel },
    ])
    const parsed = parseOptions(i)
    expect(parsed.channel).toEqual(mockChannel)
  })

  test("parses role options", () => {
    const mockRole = { id: "789", name: "Admin" }
    const i = mockInteraction([
      { name: "role", type: OptionType.Role, role: mockRole },
    ])
    const parsed = parseOptions(i)
    expect(parsed.role).toEqual(mockRole)
  })

  test("parses mentionable options (role)", () => {
    const mockRole = { id: "789", name: "Admin" }
    const i = mockInteraction([
      { name: "target", type: OptionType.Mentionable, role: mockRole, user: undefined },
    ])
    const parsed = parseOptions(i)
    expect(parsed.target).toEqual(mockRole)
  })

  test("parses mentionable options (user)", () => {
    const mockUser = { id: "123", username: "test" }
    const i = mockInteraction([
      { name: "target", type: OptionType.Mentionable, role: undefined, user: mockUser },
    ])
    const parsed = parseOptions(i)
    expect(parsed.target).toEqual(mockUser)
  })

  test("parses attachment options", () => {
    const mockAttachment = { id: "att-1", url: "https://example.com/file.png" }
    const i = mockInteraction([
      { name: "file", type: OptionType.Attachment, attachment: mockAttachment },
    ])
    const parsed = parseOptions(i)
    expect(parsed.file).toEqual(mockAttachment)
  })

  test("parses multiple options", () => {
    const i = mockInteraction([
      { name: "query", type: OptionType.String, value: "test" },
      { name: "count", type: OptionType.Integer, value: 3 },
      { name: "next", type: OptionType.Boolean, value: false },
    ])
    const parsed = parseOptions(i)
    expect(parsed).toEqual({ query: "test", count: 3, next: false })
  })

  test("parses subcommand with nested options", () => {
    const i = mockInteraction([
      {
        name: "add",
        type: OptionType.Subcommand,
        options: [
          { name: "song", type: OptionType.String, value: "never gonna give you up" },
        ],
      },
    ])
    const parsed = parseOptions(i)
    expect(parsed.__cmd).toBe("add")
    expect(parsed.song).toBe("never gonna give you up")
  })

  test("parses subcommand group with nested subcommand", () => {
    const i = mockInteraction([
      {
        name: "music",
        type: OptionType.SubcommandGroup,
        options: [
          {
            name: "play",
            type: OptionType.Subcommand,
            options: [
              { name: "url", type: OptionType.String, value: "https://example.com" },
            ],
          },
        ],
      },
    ])
    const parsed = parseOptions(i)
    expect(parsed.__group).toBe("music")
    expect(parsed.__cmd).toBe("play")
    expect(parsed.url).toBe("https://example.com")
  })

  test("handles empty options", () => {
    const i = mockInteraction([])
    const parsed = parseOptions(i)
    expect(parsed).toEqual({})
  })
})
