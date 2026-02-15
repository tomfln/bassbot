import { describe, test, expect } from "bun:test"
import { createCommand, type LoadedCommand } from "../command"

describe("createCommand", () => {
  test("returns the command config as-is", () => {
    const cmd = createCommand({
      description: "Test command",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect(cmd.description).toBe("Test command")
    expect(typeof cmd.run).toBe("function")
  })

  test("preserves sources configuration", () => {
    const cmd = createCommand({
      description: "Test",
      sources: { command: true, button: true },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect(cmd.sources).toEqual({ command: true, button: true })
  })

  test("preserves validators", () => {
    const cmd = createCommand({
      description: "Test",
      validators: [],
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect(cmd.validators).toEqual([])
  })

  test("preserves middleware", () => {
    const cmd = createCommand({
      description: "Test",
      middleware: (m) => m,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect(typeof cmd.middleware).toBe("function")
  })

  test("preserves autocomplete handler", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const handler = async () => {}
    const cmd = createCommand({
      description: "Test",
      autocomplete: handler,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect(cmd.autocomplete).toBe(handler)
  })

  test("supports localized description", () => {
    const cmd = createCommand({
      description: {
        "en-US": "English description",
        "de": "Deutsche Beschreibung",
      } as any,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    expect((cmd.description as any)["en-US"]).toBe("English description")
  })
})

describe("LoadedCommand shape", () => {
  test("can be created from createCommand output", () => {
    const config = createCommand({
      description: "Test",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      run: async () => {},
    })
    // Simulate what loadCommandFiles does
    const loaded: LoadedCommand = {
      name: "test",
      category: "general",
      ...config,
    }
    expect(loaded.name).toBe("test")
    expect(loaded.category).toBe("general")
    expect(loaded.description).toBe("Test")
  })
})
