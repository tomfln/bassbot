import { describe, test, expect } from "bun:test"
import { createMessageEmbed, embedMsg, code, EmbedColor } from "../message"

describe("EmbedColor", () => {
  test("has all expected color values", () => {
    expect(EmbedColor.Error).toBe(0xe25d50)
    expect(EmbedColor.Warn).toBe(0xff8f30)
    expect(EmbedColor.Success).toBe(0x43b581)
    expect(EmbedColor.Info).toBe(0x7289da)
    expect(EmbedColor.White90).toBe(0xe6e6e6)
  })
})

describe("code", () => {
  test("wraps text in code block", () => {
    expect(code("hello")).toBe("```hello```")
  })

  test("handles non-string values", () => {
    expect(code(42)).toBe("```42```")
  })
})

describe("createMessageEmbed", () => {
  test("creates embed with description only", () => {
    const embed = createMessageEmbed("Hello world")
    expect(embed.description).toBe("Hello world")
    expect(embed.fields).toEqual([])
  })

  test("creates embed with all options", () => {
    const embed = createMessageEmbed("Test", {
      title: "Title",
      color: EmbedColor.Success,
      timestamp: true,
      fields: [{ name: "Field", value: "Value" }],
      footer: { text: "Footer" },
    })
    expect(embed.title).toBe("Title")
    expect(embed.color).toBe(EmbedColor.Success)
    expect(embed.timestamp).toBeDefined()
    expect(embed.fields).toHaveLength(1)
    expect(embed.footer?.text).toBe("Footer")
  })

  test("does not add timestamp when not requested", () => {
    const embed = createMessageEmbed("Test")
    expect(embed.timestamp).toBeUndefined()
  })
})

describe("embedMsg", () => {
  test("wraps embed in a message object", () => {
    const msg = embedMsg("Hello")
    expect(msg.embeds).toHaveLength(1)
    expect(msg.embeds[0]!.description).toBe("Hello")
  })

  test("passes options through", () => {
    const msg = embedMsg("Test", { color: EmbedColor.Error })
    expect(msg.embeds[0]!.color).toBe(EmbedColor.Error)
  })
})
